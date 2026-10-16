import type { Application } from '@prisma/client';
import { BaseService } from '../../../core/base/BaseService.js';
import type { IApplicationService } from '../interfaces/IApplicationService.js';
import type { IApplicationRepository } from '../interfaces/IApplicationRepository.js';
import type { IJobRepository } from '../interfaces/IJobRepository.js';
import type { IWorkerRepository } from '../../workers/interfaces/IWorkerRepository.js';
import type { IAgentRepository } from '../../agents/interfaces/IAgentRepository.js';
import type { ICacheService } from '../../../core/interfaces/ICacheService.js';
import type { IEventPublisher } from '../../../core/interfaces/IEventPublisher.js';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { CacheInvalidationService } from '../../../shared/services/cache/cache-invalidation.service.js';
import { RoutingKeys } from '../../../infrastructure/queue/queue.constants.js';
import { NotFoundException, BusinessException } from '../../../core/exceptions/index.js';
import { getIO } from '../../../socket/socket.js';
import { BookingMapper } from '../../bookings/mappers/Booking.mapper.js';
import type { IBookingHistoryRepository } from '../../bookings/interfaces/IBookingHistoryRepository.js';
import {
  generateHashedStartOtp,
  bookingStartOtpCacheKey,
  BOOKING_START_OTP_CACHE_TTL_SECONDS,
} from '../../../shared/utils/booking-otp.util.js';

/**
 * Everything around job applications: workers/agents applying, providers accepting or
 * rejecting, and agents later assigning actual roster workers to an accepted application.
 *
 * Accepting is where most of the care is: it has to claim job slots and workers atomically
 * so two simultaneous accepts can't over-fill a job or double-book a worker.
 */
export class ApplicationService extends BaseService implements IApplicationService {
  constructor(
    private readonly applicationRepo: IApplicationRepository,
    private readonly jobRepo: IJobRepository,
    private readonly workerRepo: IWorkerRepository,
    private readonly agentRepo: IAgentRepository,
    private readonly cache: ICacheService,
    private readonly prisma: PrismaService,
    private readonly eventPublisher: IEventPublisher,
    private readonly historyRepo: IBookingHistoryRepository,
  ) {
    super('ApplicationService');
  }

  // A worker applies for themselves; an agent applies on behalf of the whole agency.
  async applyForJob(userId: string, jobId: string, data: any, role: 'WORKER' | 'AGENT' = 'WORKER'): Promise<Application> {
    this.log('Applying for job', { userId, jobId, role });

    const job = await this.jobRepo.findById(jobId);
    if (!job) {
      throw new NotFoundException('Job', jobId);
    }

    if (job.providerId === userId) {
      throw new BusinessException('INVALID_APPLICATION', 'You cannot apply to your own job.');
    }

    if (job.status !== 'OPEN') {
      throw new BusinessException('JOB_CLOSED', 'Job is closed');
    }

    // Agent applications belong to the agency itself: agentId is set and workerId stays null.
    // The specific workers are picked later, after the provider accepts (assignWorkerToApplication).
    if (role === 'AGENT') {
      const agent = await this.agentRepo.findByUserId(userId);
      if (!agent) {
        throw new NotFoundException('AgentProfile', userId);
      }

      const alreadyApplied = await this.applicationRepo.findByJobAndAgent(jobId, agent.id);
      if (alreadyApplied) {
        throw new BusinessException('ALREADY_APPLIED', 'You have already applied');
      }

      return await this.applicationRepo.create({
        jobId,
        applicantType: 'AGENT',
        agentId: agent.id,
        message: data.message ?? null,
        workerCount: data.workerCount ?? null,
        bidAmount: data.bidAmount,
        status: 'PENDING',
      });
    }

    // Normal worker application from here on.
    const worker = await this.workerRepo.findByUserId(userId);
    if (!worker) {
      throw new NotFoundException('WorkerProfile', userId);
    }

    const alreadyApplied = await this.applicationRepo.findByJobAndWorker(jobId, worker.id);
    if (alreadyApplied) {
      throw new BusinessException('ALREADY_APPLIED', 'You have already applied');
    }

    return await this.applicationRepo.create({
      jobId,
      applicantType: 'WORKER',
      workerId: worker.id,
      message: data.message ?? null,
      workerCount: data.workerCount ?? null,
      bidAmount: data.bidAmount,
      status: 'PENDING',
    });
  }

  // Provider-only: list everyone who applied to one of their jobs.
  async getJobApplications(userId: string, jobId: string): Promise<any[]> {
    this.log('Retrieving applications for job', { providerId: userId, jobId });

    const job = await this.jobRepo.findById(jobId);
    if (!job) {
      throw new NotFoundException('Job', jobId);
    }

    if (job.providerId !== userId) {
      throw new BusinessException('UNAUTHORIZED_ACCESS', 'Unauthorized access to job applications');
    }

    return this.applicationRepo.findManyByJobId(jobId);
  }

  // Provider accepts an application.
  //  - Worker application: a booking is created right away.
  //  - Agent application: only the slots are reserved; the booking(s) get created one by one
  //    when the agent assigns roster workers.
  // Everything runs in one DB transaction, so a failure halfway leaves nothing behind.
  async acceptApplication(userId: string, applicationId: string, paymentMode: string = 'ONLINE'): Promise<any> {
    this.log('Accepting job application', { providerId: userId, applicationId, paymentMode });

    const result = await this.prisma.client.$transaction(async (tx) => {
      const application = await this.applicationRepo.findById(applicationId, tx);
      if (!application) {
        throw new NotFoundException('Application', applicationId);
      }

      if (application.applicantType === 'WORKER') {
        if (!application.worker?.userId) {
          throw new BusinessException('USER_NOT_FOUND', 'Worker user not found');
        }
      } else if (application.applicantType === 'AGENT') {
        if (!application.agent?.userId) {
          throw new BusinessException('USER_NOT_FOUND', 'Agent user not found');
        }
      }

      if (application.job.providerId !== userId) {
        throw new BusinessException('UNAUTHORIZED', 'Unauthorized');
      }

      if (application.status !== 'PENDING') {
        throw new BusinessException('ALREADY_PROCESSED', 'Application already processed');
      }

      if (application.job.status !== 'OPEN') {
        throw new BusinessException('JOB_CLOSED', 'Job is closed');
      }

      // A worker takes one slot; an agent takes as many as the workers they promised.
      const decrementAmount =
        application.applicantType === 'AGENT' ? application.workerCount ?? 1 : 1;

      // Reserve the slots with a single conditional UPDATE instead of read-then-write.
      // If two providers' accepts race, Postgres runs the UPDATEs one after the other, so the
      // second one sees the already-reduced count and fails here rather than pushing
      // requiredWorkers below zero.
      const decrementResult = await tx.job.updateMany({
        where: {
          id: application.jobId,
          status: 'OPEN',
          requiredWorkers: { gte: decrementAmount },
        },
        data: {
          requiredWorkers: { decrement: decrementAmount },
        },
      });

      if (decrementResult.count === 0) {
        throw new BusinessException('JOB_FULL', 'Not enough worker slots remaining on this job');
      }

      // For a worker application we now know exactly who is going, so mark them busy.
      // The slot check above only protects one job; this stops the same worker from being
      // accepted on two different jobs at the same moment.
      if (application.applicantType === 'WORKER' && application.workerId) {
        const workerClaimed = await tx.workerProfile.updateMany({
          where: { id: application.workerId, isAvailable: true },
          data: { isAvailable: false },
        });
        if (workerClaimed.count === 0) {
          throw new BusinessException('WORKER_UNAVAILABLE', 'This worker has just been booked on another job');
        }
      }

      await this.applicationRepo.update(applicationId, { status: 'ACCEPTED' }, tx);

      // Worker applications get their booking now. Agent applications don't have a worker
      // yet, so their bookings are created later in assignWorkerToApplication().
      let booking: Awaited<ReturnType<typeof tx.booking.create>> | null = null;

      if (application.applicantType === 'WORKER') {
        // Work-start OTP: the DB only keeps a hash. The plaintext goes into the cache so the
        // provider can still read it out when the worker arrives.
        const { code: startOtpPlain, hash: startOtp } = await generateHashedStartOtp();

        booking = await tx.booking.create({
          data: {
            jobId: application.jobId,
            providerId: application.job.providerId,
            workerId: application.workerId,
            agentId: application.agentId,
            amount: application.bidAmount ?? 0,
            status: paymentMode === 'OFFLINE' ? BookingStatus.WORKER_ASSIGNED : BookingStatus.CREATED,
            paymentMode: paymentMode === 'OFFLINE' ? 'OFFLINE' : 'ONLINE',
            startOtp,
          },
        });

        await this.cache.set(bookingStartOtpCacheKey(booking.id), startOtpPlain, BOOKING_START_OTP_CACHE_TTL_SECONDS);

        // Offline bookings skip straight to WORKER_ASSIGNED without going through
        // BookingStateService, so write the first history row by hand. Online bookings start
        // at CREATED, which is the normal starting point and needs no entry.
        if (booking.status === BookingStatus.WORKER_ASSIGNED) {
          await this.historyRepo.append(
            {
              bookingId: booking.id,
              fromStatus: BookingStatus.CREATED,
              toStatus: BookingStatus.WORKER_ASSIGNED,
              changedBy: userId,
              reason: 'Job application accepted with offline payment',
            },
            tx,
          );
        }
      }

      // Once every slot is taken the job is closed and the remaining pending applicants are rejected.
      const updatedJob = await tx.job.findUniqueOrThrow({ where: { id: application.jobId } });

      if (updatedJob.requiredWorkers <= 0) {
        await tx.job.update({
          where: { id: updatedJob.id },
          data: {
            status: 'ASSIGNED',
            requiredWorkers: 0,
          },
        });

        await this.applicationRepo.updateManyPendingToRejected(updatedJob.id, tx);
      }

      return {
        booking,
        workerUserId: application.worker?.userId ?? null,
        agentUserId: application.agent?.userId ?? null,
      };
    });

    await CacheInvalidationService.afterJobAccepted(
      userId,
      result.workerUserId,
      result.agentUserId,
    );

    if (!result.booking) {
      // Agent application: no booking yet. Ping the agent so they know it's time to assign workers.
      try {
        getIO().to(`user:${result.agentUserId}`).emit('applicationUpdated', {
          applicationId,
          status: 'ACCEPTED',
        });
      } catch (err) {
        this.logger.error('Failed to emit application-accepted socket event', err);
      }
      return { success: true, applicationId, awaitingWorkerAssignment: true };
    }

    // Let the rest of the system know (emails etc. listen for this event).
    await this.eventPublisher.publish(RoutingKeys.BOOKING_CREATED, result.booking);

    // Update both parties' screens live. A socket failure must not fail the accept itself.
    try {
      const io = getIO();
      const mappedBooking = BookingMapper.toResponse(result.booking, { userId });
      // Notify provider
      io.to(`user:${userId}`).emit('bookingUpdated', mappedBooking);
      // Notify worker
      if (result.workerUserId) {
        io.to(`user:${result.workerUserId}`).emit('bookingUpdated', mappedBooking);
      }
    } catch (err) {
      this.logger.error('Failed to emit booking creation socket event', err);
    }

    return { success: true, bookingId: result.booking.id, paymentMode: result.booking.paymentMode };
  }

  // Agent picks one roster worker for an application the provider already accepted.
  // Call it once per worker; each call creates its own booking until all promised slots are filled.
  async assignWorkerToApplication(agentId: string, applicationId: string, workerId: string): Promise<any> {
    this.log('Agent assigning a roster worker to an accepted application', { agentId, applicationId, workerId });

    const result = await this.prisma.client.$transaction(async (tx) => {
      const application = await this.applicationRepo.findById(applicationId, tx);
      if (!application) {
        throw new NotFoundException('Application', applicationId);
      }

      if (application.applicantType !== 'AGENT' || application.agentId !== agentId) {
        throw new BusinessException('UNAUTHORIZED', 'This application does not belong to your agency');
      }

      if (application.status !== 'ACCEPTED') {
        throw new BusinessException('APPLICATION_NOT_ACCEPTED', 'This application has not been accepted by the Provider yet');
      }

      const workerCount = application.workerCount ?? 1;
      const alreadyAssigned = await tx.booking.count({
        where: { jobId: application.jobId, agentId },
      });
      if (alreadyAssigned >= workerCount) {
        throw new BusinessException('ALL_SLOTS_FILLED', `All ${workerCount} worker slot(s) for this application have already been assigned`);
      }

      // Mark the worker busy in one conditional UPDATE so the same roster worker can't be
      // handed to two bookings at once.
      const claimed = await tx.workerProfile.updateMany({
        where: { id: workerId, isAvailable: true },
        data: { isAvailable: false },
      });
      if (claimed.count === 0) {
        throw new BusinessException('WORKER_UNAVAILABLE', 'This worker is not currently available');
      }

      // Agent bookings are always OFFLINE (cash/UPI). The provider agreed to one total bid,
      // and charging it online in separate pieces as workers get assigned would be confusing.
      // Instant requests work the same way. Each booking gets an equal share of the bid.
      const perWorkerAmount = Number(application.bidAmount ?? 0) / workerCount;
      const { code: startOtpPlain, hash: startOtp } = await generateHashedStartOtp();

      const booking = await tx.booking.create({
        data: {
          jobId: application.jobId,
          providerId: application.job.providerId,
          workerId,
          agentId,
          amount: perWorkerAmount,
          status: BookingStatus.WORKER_ASSIGNED,
          paymentMode: 'OFFLINE',
          startOtp,
        },
      });

      await this.cache.set(bookingStartOtpCacheKey(booking.id), startOtpPlain, BOOKING_START_OTP_CACHE_TTL_SECONDS);

      await this.historyRepo.append(
        {
          bookingId: booking.id,
          fromStatus: BookingStatus.CREATED,
          toStatus: BookingStatus.WORKER_ASSIGNED,
          changedBy: agentId,
          reason: 'Agent assigned a roster worker to the accepted application',
        },
        tx,
      );

      return booking;
    });

    await this.eventPublisher.publish(RoutingKeys.BOOKING_CREATED, result);

    try {
      const io = getIO();
      const mappedBooking = BookingMapper.toResponse(result, {});
      io.to(`user:${result.providerId}`).emit('bookingUpdated', mappedBooking);
    } catch (err) {
      this.logger.error('Failed to emit booking creation socket event', err);
    }

    return { success: true, bookingId: result.id };
  }

  // Provider turns down a pending application; the applicant is told over websocket.
  async rejectApplication(userId: string, applicationId: string): Promise<any> {
    this.log('Rejecting job application', { providerId: userId, applicationId });

    const application = await this.applicationRepo.findById(applicationId);
    if (!application) {
      throw new NotFoundException('Application', applicationId);
    }

    if (application.job.providerId !== userId) {
      throw new BusinessException('UNAUTHORIZED', 'Unauthorized');
    }

    if (application.status !== 'PENDING') {
      throw new BusinessException('ALREADY_PROCESSED', 'Application already processed');
    }

    await this.applicationRepo.update(applicationId, { status: 'REJECTED' });

    try {
      const io = getIO();
      const recipientUserId = application.worker?.userId ?? application.agent?.userId;
      if (recipientUserId) {
        io.to(`user:${recipientUserId}`).emit('applicationUpdated', {
          applicationId,
          jobId: application.jobId,
          status: 'REJECTED',
        });
      }
    } catch (err) {
      this.logger.error('Failed to emit application rejection socket event', err);
    }

    return { success: true };
  }

  // The logged-in worker's own applications.
  async getMyApplications(userId: string): Promise<any[]> {
    this.log('Retrieving my applications', { workerUserId: userId });

    const worker = await this.workerRepo.findByUserId(userId);
    if (!worker) {
      throw new NotFoundException('WorkerProfile', userId);
    }

    return this.applicationRepo.findManyByWorkerId(worker.id);
  }
}

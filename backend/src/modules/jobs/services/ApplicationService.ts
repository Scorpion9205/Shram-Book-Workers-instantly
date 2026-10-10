import type { Application } from '@prisma/client';
import { BaseService } from '../../../core/base/BaseService.js';
import type { IApplicationService } from '../interfaces/IApplicationService.js';
import type { IApplicationRepository } from '../interfaces/IApplicationRepository.js';
import type { IJobRepository } from '../interfaces/IJobRepository.js';
import type { IWorkerRepository } from '../../workers/interfaces/IWorkerRepository.js';
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

export class ApplicationService extends BaseService implements IApplicationService {
  constructor(
    private readonly applicationRepo: IApplicationRepository,
    private readonly jobRepo: IJobRepository,
    private readonly workerRepo: IWorkerRepository,
    private readonly cache: ICacheService,
    private readonly prisma: PrismaService,
    private readonly eventPublisher: IEventPublisher,
    private readonly historyRepo: IBookingHistoryRepository,
  ) {
    super('ApplicationService');
  }

  async applyForJob(userId: string, jobId: string, data: any): Promise<Application> {
    this.log('Applying for job', { userId, jobId });

    const worker = await this.workerRepo.findByUserId(userId);
    if (!worker) {
      throw new NotFoundException('WorkerProfile', userId);
    }

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

      const decrementAmount =
        application.applicantType === 'AGENT' ? application.workerCount ?? 1 : 1;

      // Atomic, conditional decrement: only succeeds if the job is still OPEN and has enough
      // slots left as of THIS statement's execution (not our earlier read). Postgres serializes
      // concurrent UPDATEs on the same row, so a second concurrent acceptApplication() call for
      // the same job will see the post-decrement value and correctly fail here instead of both
      // calls creating a booking and driving requiredWorkers negative.
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

      // Only WORKER-type applications pin down a specific worker at this point (AGENT
      // applications resolve to a worker pool assignment elsewhere) — atomically claim that
      // worker's availability so they can't be accepted onto two different jobs at once. The
      // slot guard above only serializes concurrent accepts on the SAME job, so a worker who
      // applied to two different jobs could otherwise be accepted onto both.
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

      // Generate a cryptographically secure 6-digit start OTP — only the Argon2id hash is
      // persisted; the plaintext is cached separately (short TTL) for the Provider to view.
      const { code: startOtpPlain, hash: startOtp } = await generateHashedStartOtp();

      const booking = await tx.booking.create({
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

      // Offline-payment bookings are created directly at WORKER_ASSIGNED, bypassing
      // BookingStateService — without this they'd have zero audit history until (if ever)
      // their next transition. Online bookings start at CREATED, which needs no genesis
      // entry since that's already the FSM's natural starting point.
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

    // Publish booking.created event
    await this.eventPublisher.publish(RoutingKeys.BOOKING_CREATED, result.booking);

    await CacheInvalidationService.afterJobAccepted(
      userId,
      result.workerUserId,
      result.agentUserId,
    );

    // Emit real-time socket events for booking creation
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

  async getMyApplications(userId: string): Promise<any[]> {
    this.log('Retrieving my applications', { workerUserId: userId });

    const worker = await this.workerRepo.findByUserId(userId);
    if (!worker) {
      throw new NotFoundException('WorkerProfile', userId);
    }

    return this.applicationRepo.findManyByWorkerId(worker.id);
  }
}

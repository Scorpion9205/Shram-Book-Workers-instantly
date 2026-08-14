import type { AgentProfile } from '@prisma/client';
import { BaseService } from '../../../core/base/BaseService.js';
import type { IAgentService } from '../interfaces/IAgentService.js';
import type { IAgentRepository } from '../interfaces/IAgentRepository.js';
import type { IAgentWorkerRepository } from '../interfaces/IAgentWorkerRepository.js';
import { BookingStatus, ApplicationStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { NotFoundException, BusinessException } from '../../../core/exceptions/index.js';

export class AgentService extends BaseService implements IAgentService {
  constructor(
    private readonly agentRepo: IAgentRepository,
    private readonly agentWorkerRepo: IAgentWorkerRepository,
    private readonly prisma: PrismaService,
  ) {
    super('AgentService');
  }

  private async getAgentByUserId(userId: string): Promise<AgentProfile> {
    const agent = await this.agentRepo.findByUserId(userId);
    if (!agent) {
      throw new NotFoundException('AgentProfile', userId);
    }
    return agent;
  }

  async createProfile(userId: string, data: any): Promise<AgentProfile> {
    this.log('Creating agent profile', { userId });

    const existing = await this.agentRepo.findByUserId(userId);
    if (existing) {
      throw new BusinessException('AGENT_PROFILE_EXISTS', 'Agent profile already exists.');
    }

    return this.agentRepo.create(userId, data);
  }

  async getMyProfile(userId: string): Promise<any> {
    this.log('Retrieving agent profile details', { userId });
    const profile = await this.prisma.client.agentProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            city: true,
            state: true,
            profileImage: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('AgentProfile', userId);
    }

    return profile;
  }

  async updateProfile(userId: string, data: any): Promise<AgentProfile> {
    this.log('Updating agent profile details', { userId, data });

    const exists = await this.agentRepo.findByUserId(userId);
    if (!exists) {
      throw new NotFoundException('AgentProfile', userId);
    }

    return this.agentRepo.update(userId, {
      ...(data.agencyName !== undefined && { agencyName: data.agencyName }),
      ...(data.description !== undefined && { description: data.description }),
    });
  }

  async getDashboard(userId: string): Promise<any> {
    this.log('Fetching agent dashboard counters', { userId });
    const agent = await this.getAgentByUserId(userId);

    const [
      totalWorkers,
      availableWorkers,
      pendingApplications,
      activeBookings,
      completedBookings,
    ] = await Promise.all([
      this.agentWorkerRepo.countByAgentId(agent.id),
      this.agentWorkerRepo.countAvailableByAgentId(agent.id),
      this.prisma.client.application.count({
        where: {
          agentId: agent.id,
          status: ApplicationStatus.PENDING,
        },
      }),
      this.prisma.client.booking.count({
        where: {
          agentId: agent.id,
          status: {
            in: [
              BookingStatus.CREATED,
              BookingStatus.PAYMENT_PENDING,
              BookingStatus.PAYMENT_CONFIRMED,
              BookingStatus.WORKER_ASSIGNED,
              BookingStatus.WORKER_EN_ROUTE,
              BookingStatus.OTP_VERIFIED,
              BookingStatus.WORK_STARTED,
            ],
          },
        },
      }),
      this.prisma.client.booking.count({
        where: {
          agentId: agent.id,
          status: BookingStatus.WORK_COMPLETED,
        },
      }),
    ]);

    return {
      agencyName: agent.agencyName,
      rating: agent.rating,
      totalWorkers,
      availableWorkers,
      pendingApplications,
      activeBookings,
      completedBookings,
    };
  }

  async getMyApplications(userId: string): Promise<any[]> {
    this.log('Retrieving my applications', { agentUserId: userId });
    const agent = await this.getAgentByUserId(userId);

    return this.prisma.client.application.findMany({
      where: { agentId: agent.id },
      include: {
        job: {
          include: {
            provider: {
              select: {
                id: true,
                name: true,
                phone: true,
                profileImage: true,
              },
            },
            skill: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getMyBookings(userId: string): Promise<any[]> {
    this.log('Retrieving bookings for agent', { agentUserId: userId });
    const agent = await this.getAgentByUserId(userId);

    return this.prisma.client.booking.findMany({
      where: { agentId: agent.id },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            phone: true,
            profileImage: true,
          },
        },
        job: {
          include: {
            skill: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

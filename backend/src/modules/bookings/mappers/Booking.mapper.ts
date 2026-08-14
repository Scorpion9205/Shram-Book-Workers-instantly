import type { Booking } from '@prisma/client';

export interface BookingResponseDto {
  id: string;
  jobId: string | null;
  providerId: string;
  workerId: string | null;
  agentId: string | null;
  amount: number;
  estimatedFare: number;
  finalFare: number | null;
  status: string;
  type: string;
  address: any;
  notes: string | null;
  durationHours: number | null;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  provider?: any;
  worker?: any;
  job?: any;
  instantRequest?: any;
  statusHistory?: any[];
}

export class BookingMapper {
  static toResponse(booking: any): BookingResponseDto {
    return {
      id: booking.id,
      jobId: booking.jobId,
      providerId: booking.providerId,
      workerId: booking.workerId,
      agentId: booking.agentId,
      amount: Number(booking.amount),
      estimatedFare: Number(booking.estimatedFare),
      finalFare: booking.finalFare ? Number(booking.finalFare) : null,
      status: booking.status,
      type: booking.type,
      address: booking.address,
      notes: booking.notes,
      durationHours: booking.durationHours ? Number(booking.durationHours) : null,
      scheduledAt: booking.scheduledAt ? booking.scheduledAt.toISOString() : null,
      startedAt: booking.startedAt ? booking.startedAt.toISOString() : null,
      completedAt: booking.completedAt ? booking.completedAt.toISOString() : null,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
      ...(booking.provider && { provider: booking.provider }),
      ...(booking.worker && { worker: booking.worker }),
      ...(booking.job && { job: booking.job }),
      ...(booking.instantRequest && { instantRequest: booking.instantRequest }),
      ...(booking.statusHistory && {
        statusHistory: booking.statusHistory.map((h: any) => ({
          id: h.id,
          fromStatus: h.fromStatus,
          toStatus: h.toStatus,
          changedBy: h.changedBy,
          reason: h.reason,
          changedAt: h.changedAt.toISOString(),
        })),
      }),
    };
  }

  static toResponseList(bookings: any[]): BookingResponseDto[] {
    return bookings.map(b => this.toResponse(b));
  }
}

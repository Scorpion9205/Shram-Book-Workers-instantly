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
  startOtp?: string | null;
  paymentMode?: string;
}

export class BookingMapper {
  static toResponse(booking: any, currentUser?: any): BookingResponseDto {
    const isProvider = currentUser && (currentUser.id === booking.providerId || currentUser.userId === booking.providerId);
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
      paymentMode: booking.paymentMode,
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
      ...(isProvider && { startOtp: booking.startOtp }),
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

  static toResponseList(bookings: any[], currentUser?: any): BookingResponseDto[] {
    return bookings.map(b => this.toResponse(b, currentUser));
  }

  /**
   * Returns a unified list of worker IDs assigned to this booking.
   *
   * Architecture Note (1-to-1 vs 1-to-N Worker Assignment):
   * - 1-to-1 Assignment (Instant Bookings / Direct Request):
   *   The assigned worker is stored directly in `booking.workerId`.
   * - 1-to-N Assignment (Group Jobs / Multi-Worker Bookings):
   *   Workers are linked via the `BookingWorker` join table or accepted `JobApplication` records.
   *
   * This helper extracts worker IDs across both assignment topologies uniformly.
   */
  static getAssignedWorkerIds(booking: any): string[] {
    const ids: string[] = [];
    if (booking.workerId && !ids.includes(booking.workerId)) {
      ids.push(booking.workerId);
    }
    if (Array.isArray(booking.bookingWorkers)) {
      for (const bw of booking.bookingWorkers) {
        if (bw.workerId && !ids.includes(bw.workerId)) {
          ids.push(bw.workerId);
        }
      }
    }
    if (Array.isArray(booking.job?.applications)) {
      for (const app of booking.job.applications) {
        if (app.status === 'ACCEPTED' && app.workerId && !ids.includes(app.workerId)) {
          ids.push(app.workerId);
        }
      }
    }
    return ids;
  }
}

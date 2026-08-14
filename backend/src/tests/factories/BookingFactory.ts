import type { Booking, BookingStatus, BookingType } from "@prisma/client";
import { Prisma } from "@prisma/client";

export class BookingFactory {
  static create(overrides: Partial<Booking> = {}): Booking {
    return {
      id: overrides.id || `booking_${Math.random().toString(36).substring(2, 9)}`,
      jobId: overrides.jobId !== undefined ? overrides.jobId : null,
      providerId: overrides.providerId || "provider_1",
      workerId: overrides.workerId !== undefined ? overrides.workerId : null,
      agentId: overrides.agentId !== undefined ? overrides.agentId : null,
      amount: overrides.amount || new Prisma.Decimal(500),
      status: overrides.status || ("CREATED" as BookingStatus),
      startedAt: overrides.startedAt !== undefined ? overrides.startedAt : null,
      completedAt: overrides.completedAt !== undefined ? overrides.completedAt : null,
      instantRequestId: overrides.instantRequestId !== undefined ? overrides.instantRequestId : null,
      instantRequestResponseId: overrides.instantRequestResponseId !== undefined ? overrides.instantRequestResponseId : null,
      startOtp: overrides.startOtp !== undefined ? overrides.startOtp : null,
      type: overrides.type || ("NORMAL_JOB" as BookingType),
      estimatedFare: overrides.estimatedFare || new Prisma.Decimal(500),
      finalFare: overrides.finalFare !== undefined ? overrides.finalFare : null,
      scheduledAt: overrides.scheduledAt !== undefined ? overrides.scheduledAt : null,
      durationHours: overrides.durationHours !== undefined ? overrides.durationHours : null,
      latitude: overrides.latitude !== undefined ? overrides.latitude : null,
      longitude: overrides.longitude !== undefined ? overrides.longitude : null,
      address: overrides.address !== undefined ? overrides.address : null,
      notes: overrides.notes !== undefined ? overrides.notes : null,
      deletedAt: overrides.deletedAt !== undefined ? overrides.deletedAt : null,
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
    };
  }
}

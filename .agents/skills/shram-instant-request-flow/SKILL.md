---
name: shram-instant-request-flow
description: >-
  Use this skill when implementing the Instant Request feature in SHRAM:
  progressive radius expansion, Redis geo-index, Socket.IO broadcast to workers,
  atomic accept with SETNX lock, and cancellation flow. Activate when: user
  asks about instant booking, real-time worker matching, Redis geo queries,
  or the broadcasting flow.
---

# SHRAM — Instant Request Flow (Uber-Style)

## Flow Overview

```
Provider submits instant request
       ↓
POST /instant-requests
  → computeEstimatedFare()
  → create InstantRequest(status=BROADCASTING)
  → persist to DB
  → start EligibleWorkerStrategy
       ↓
EligibleWorkerStrategy (Progressive Radius Expansion)
  → GEOSEARCH radius=2km (from PlatformSetting)
  → if 0 workers → expand to 5km
  → if 0 workers → expand to 10km
  → if still 0 → keep broadcasting (no timeout — provider cancels manually)
       ↓
Socket.IO: emit 'instant_request:new' to eligible worker rooms
       ↓
Worker accepts → POST /instant-requests/:id/accept
  → Redis SETNX lock (atomic, prevents double-accept)
  → Create Booking
  → Emit 'booking.created' event
  → broadcast 'instant_request:closed' to all other workers
       ↓
Provider cancels → POST /instant-requests/:id/cancel
  → status → CANCELLED_BY_PROVIDER
  → broadcast 'instant_request:closed'
  → remove from Redis geo broadcast set
```

## InstantRequestService

```typescript
// modules/instant-requests/services/InstantRequestService.ts
export class InstantRequestService implements IInstantRequestService {
  constructor(
    private readonly requestRepo: IInstantRequestRepository,
    private readonly workerRepo: IWorkerRepository,
    private readonly bookingService: IBookingService,
    private readonly fareCalculator: FareCalculator,
    private readonly cache: ICacheService,
    private readonly socketGateway: ISocketGateway,
    private readonly eventPublisher: IEventPublisher,
    private readonly platformSettingRepo: IPlatformSettingRepository,
  ) {}

  async create(providerId: string, dto: CreateInstantRequestDto): Promise<InstantRequest> {
    const { estimatedFare } = await this.fareCalculator.calculate({
      skillId: dto.skillId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      durationHours: dto.durationHours,
    });

    const request = await this.requestRepo.create({
      providerId,
      skillId: dto.skillId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      durationHours: dto.durationHours,
      estimatedFare,
      status: InstantRequestStatus.BROADCASTING,
    });

    // Fire-and-forget — don't await broadcast; return response immediately
    setImmediate(() => this.broadcastToEligibleWorkers(request));

    return request;
  }

  private async broadcastToEligibleWorkers(request: InstantRequest): Promise<void> {
    const tiers = await this.getRadiusTiers();

    for (const radiusKm of tiers) {
      const workerIds = await this.cache.geoSearch(
        CacheKeys.workerLocation,
        request.latitude,
        request.longitude,
        radiusKm,
        'km',
      );

      const eligibleWorkers = await this.filterEligibleWorkers(workerIds, request.skillId);

      if (eligibleWorkers.length > 0) {
        await this.emitToWorkers(eligibleWorkers, request);
        return; // Stop expanding — found workers at this tier
      }
    }

    // No workers found at any tier — emit to provider that no workers available nearby
    await this.socketGateway.emitToUser(request.providerId, 'instant_request:no_workers', {
      requestId: request.id,
    });
  }

  async accept(workerId: string, requestId: string): Promise<Booking> {
    // Atomic lock — SETNX prevents double-accept
    const lockKey = CacheKeys.instantRequestLock(requestId);
    const locked = await this.cache.setNX(lockKey, workerId, 30);
    if (!locked) throw new ConflictException('This request has already been accepted');

    const request = await this.requestRepo.findById(requestId);
    if (!request) throw new NotFoundException('InstantRequest', requestId);
    if (request.status !== InstantRequestStatus.BROADCASTING) {
      throw new BusinessException('IR_NOT_AVAILABLE', 'This request is no longer available');
    }

    // Update request status
    await this.requestRepo.updateStatus(requestId, InstantRequestStatus.ACCEPTED);

    // Create the booking
    const booking = await this.bookingService.createFromInstantRequest(workerId, request);

    // Notify all other workers that this request is closed
    await this.socketGateway.emitToRoom(
      `instant_request:${requestId}`,
      'instant_request:closed',
      { requestId, reason: 'ACCEPTED' },
    );

    // Publish domain event
    await this.eventPublisher.publish('instant_request.accepted', {
      requestId,
      bookingId: booking.id,
      workerId,
      providerId: request.providerId,
    });

    return booking;
  }

  async cancel(providerId: string, requestId: string): Promise<void> {
    const request = await this.requestRepo.findById(requestId);
    if (!request) throw new NotFoundException('InstantRequest', requestId);
    if (request.providerId !== providerId) throw new AuthorizationException('Not your request');
    if (request.status !== InstantRequestStatus.BROADCASTING) {
      throw new BusinessException('IR_NOT_CANCELLABLE', 'Request cannot be cancelled in its current state');
    }

    await this.requestRepo.updateStatus(requestId, InstantRequestStatus.CANCELLED_BY_PROVIDER);

    await this.socketGateway.emitToRoom(
      `instant_request:${requestId}`,
      'instant_request:closed',
      { requestId, reason: 'CANCELLED_BY_PROVIDER' },
    );
  }

  private async getRadiusTiers(): Promise<number[]> {
    const setting = await this.platformSettingRepo.get('instantRequestRadiusTiers');
    return (setting?.value as number[]) ?? [2, 5, 10]; // fallback — but should be in DB
  }

  private async filterEligibleWorkers(workerIds: string[], skillId: string): Promise<string[]> {
    // Filter workers who have this skill and are currently available
    return this.workerRepo.filterEligible(workerIds, skillId);
  }

  private async emitToWorkers(workerIds: string[], request: InstantRequest): Promise<void> {
    const payload = {
      requestId: request.id,
      skillId: request.skillId,
      latitude: request.latitude,
      longitude: request.longitude,
      estimatedFare: Number(request.estimatedFare),
      durationHours: request.durationHours,
    };

    await Promise.all(
      workerIds.map(workerId =>
        this.socketGateway.emitToUser(workerId, 'instant_request:new', payload)
      ),
    );
  }
}
```

## Worker Online/Offline Location (Redis Geo)

```typescript
// modules/workers/services/WorkerLocationService.ts
async setOnline(workerId: string, lat: number, lng: number): Promise<void> {
  await Promise.all([
    this.cache.geoAdd(CacheKeys.workerLocation, { lat, lng, member: workerId }),
    this.cache.set(CacheKeys.workerStatus(workerId), 'ONLINE', 300), // 5 min TTL
  ]);
}

async setOffline(workerId: string): Promise<void> {
  await Promise.all([
    this.cache.del(CacheKeys.workerStatus(workerId)),
    // Note: ioredis GEODREM — remove from geo set
    this.cache.geoRemove(CacheKeys.workerLocation, workerId),
  ]);
}

async updateLocation(workerId: string, lat: number, lng: number): Promise<void> {
  await this.cache.geoAdd(CacheKeys.workerLocation, { lat, lng, member: workerId });
  // Refresh TTL
  await this.cache.expire(CacheKeys.workerStatus(workerId), 300);
}
```

## Socket Events Reference

| Event | Direction | Payload |
|---|---|---|
| `instant_request:new` | Server → Worker | `{ requestId, skillId, lat, lng, estimatedFare, durationHours }` |
| `instant_request:closed` | Server → Worker | `{ requestId, reason }` |
| `instant_request:accepted` | Server → Provider | `{ requestId, bookingId, worker: {...} }` |
| `instant_request:no_workers` | Server → Provider | `{ requestId }` |
| `worker:location_update` | Worker → Server | `{ lat, lng }` |

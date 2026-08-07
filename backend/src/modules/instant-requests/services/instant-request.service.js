import prisma from "../../../shared/config/prisma.js";
import { FareService } from "../../../shared/services/pricing/fare.service.js";
import { getIO } from "../../../socket/socket.js";
import { calculateDistance } from "../../../shared/utils/distance.js";
import { RedisService } from "../../../shared/services/redis/redis.service.js";
import { CacheInvalidationService } from "../../../shared/services/cache/cache-invalidation.service.js";
import { InstantMatchingService } from "./instant-matching.service.js";
export class InstantRequestService {
    static async createInstantRequest(userId, data) {
        await prisma.providerProfile.upsert({
            where: {
                userId,
            },
            update: {},
            create: {
                userId,
            },
        });
        const { title, description, latitude, longitude, address, amount, items, bookingMode, } = data;
        return await prisma.$transaction(async (tx) => {
            const fare = await FareService.calculateInstantFare(items);
            const request = await tx.instantRequest.create({
                data: {
                    providerId: userId,
                    title,
                    description: description ?? null,
                    latitude,
                    longitude,
                    address: address ?? null,
                    amount: amount ?? fare.total,
                    bookingMode,
                    skillId: items[0]?.skillId || null,
                    expiresAt: new Date(Date.now() +
                        30 * 60 * 1000),
                },
            });
            await tx.instantRequestItem.createMany({
                data: items.map((item) => ({
                    requestId: request.id,
                    skillId: item.skillId,
                    requiredWorkers: item.requiredWorkers,
                })),
            });
            const createdRequest = await tx.instantRequest.findUnique({
                where: {
                    id: request.id,
                },
                include: {
                    provider: {
                        select: {
                            name: true,
                        },
                    },
                    items: {
                        include: {
                            skill: true,
                        },
                    },
                },
            });
            if (!createdRequest) {
                throw new Error("Request not found");
            }
            // Start asynchronous radius expansion matching
            InstantMatchingService.startMatching(createdRequest.id).catch(err => {
                console.error("Async matching orchestrator error:", err);
            });
            return createdRequest;
        });
    }
    static async getNearbyRequests(userId) {
        const cacheKey = `requests:nearby:${userId}`;
        const cachedRequests = await RedisService.get(cacheKey);
        if (cachedRequests) {
            console.log("✅ Nearby Requests from Redis");
            return cachedRequests;
        }
        const worker = await prisma.workerProfile.findUnique({
            where: {
                userId,
            },
            include: {
                skills: true,
            },
        });
        if (!worker) {
            throw new Error("Worker profile not found");
        }
        const workerLocation = await prisma.userLocation.findUnique({
            where: {
                userId,
            },
        });
        if (!workerLocation) {
            throw new Error("Worker location not found");
        }
        const skillIds = worker.skills.map((workerSkill) => workerSkill.skillId);
        if (skillIds.length === 0) {
            return [];
        }
        const requests = await prisma.instantRequest.findMany({
            where: {
                status: "OPEN",
                expiresAt: {
                    gt: new Date(),
                },
                items: {
                    some: {
                        skillId: {
                            in: skillIds,
                        },
                        status: "OPEN",
                    },
                },
            },
            select: {
                id: true,
                title: true,
                description: true,
                amount: true,
                address: true,
                latitude: true,
                longitude: true,
                createdAt: true,
                provider: {
                    select: {
                        name: true,
                    },
                },
                items: {
                    where: {
                        skillId: {
                            in: skillIds,
                        },
                        status: "OPEN",
                    },
                    select: {
                        id: true,
                        requiredWorkers: true,
                        acceptedWorkers: true,
                        skill: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        const SEARCH_RADIUS_KM = 10;
        const nearbyRequests = requests
            .map((request) => {
            const distance = calculateDistance(workerLocation.latitude, workerLocation.longitude, request.latitude, request.longitude);
            return {
                ...request,
                distanceKm: Number(distance.toFixed(2)),
            };
        })
            .filter((request) => request.distanceKm <=
            SEARCH_RADIUS_KM)
            .sort((a, b) => a.distanceKm -
            b.distanceKm);
        await RedisService.set(cacheKey, nearbyRequests, 60);
        console.log("✅ Nearby Requests Cached");
        return nearbyRequests;
    }
    static async acceptRequest(userId, itemId) {
        const worker = await prisma.workerProfile.findUnique({
            where: {
                userId,
            },
            include: {
                skills: true,
            },
        });
        if (!worker) {
            throw new Error("Worker profile not found");
        }
        if (!worker.isAvailable) {
            throw new Error("Worker is not available for bookings");
        }
        const lockKey = `lock:instant-item:${itemId}`;
        const lockToken = await RedisService.acquireLock(lockKey, 15);
        if (!lockToken) {
            throw new Error("Another worker is already accepting this request.");
        }
        try {
            const result = await prisma.$transaction(async (tx) => {
                const item = await tx.instantRequestItem.findUnique({
                    where: {
                        id: itemId,
                    },
                    include: {
                        request: true,
                    },
                });
                if (!item) {
                    throw new Error("Request item not found");
                }
                if (item.request.bookingMode !== "DIRECT") {
                    throw new Error("This request does not support direct accept");
                }
                if (item.request.status !== "OPEN") {
                    throw new Error("Request is closed");
                }
                const hasSkill = worker.skills.some((skill) => skill.skillId === item.skillId);
                if (!hasSkill) {
                    throw new Error("You don't have required skill");
                }
                const alreadyAccepted = await tx.instantRequestResponse.findFirst({
                    where: {
                        itemId,
                        workerId: worker.id,
                    },
                });
                if (alreadyAccepted) {
                    throw new Error("You already accepted this request");
                }
                if (item.acceptedWorkers >=
                    item.requiredWorkers) {
                    throw new Error("All slots are filled");
                }
                const response = await tx.instantRequestResponse.create({
                    data: {
                        itemId,
                        workerId: worker.id,
                        status: "ACCEPTED",
                    },
                });
                const startOtp = Math.floor(1000 + Math.random() * 9000).toString();
                const booking = await tx.booking.create({
                    data: {
                        providerId: item.request.providerId,
                        workerId: worker.id,
                        instantRequestId: item.request.id,
                        instantRequestResponseId: response.id,
                        amount: item.request.amount,
                        status: "CONFIRMED",
                        startOtp,
                    },
                });
                // Mark worker as unavailable
                await tx.workerProfile.update({
                    where: { id: worker.id },
                    data: { isAvailable: false }
                });
                // Remove from Redis GEO list
                for (const s of worker.skills) {
                    await RedisService.geoRemove(`geo:instant-workers:${s.skillId}`, worker.id);
                }
                const updateResult = await tx.instantRequestItem.updateMany({
                    where: {
                        id: itemId,
                        acceptedWorkers: {
                            lt: item.requiredWorkers,
                        },
                    },
                    data: {
                        acceptedWorkers: {
                            increment: 1,
                        },
                    },
                });
                if (updateResult.count === 0) {
                    throw new Error("All slots are already filled");
                }
                const updatedItem = await tx.instantRequestItem.findUnique({
                    where: {
                        id: itemId,
                    },
                });
                if (!updatedItem) {
                    throw new Error("Request item not found");
                }
                if (updatedItem.acceptedWorkers >=
                    updatedItem.requiredWorkers) {
                    await tx.instantRequestItem.update({
                        where: {
                            id: itemId,
                        },
                        data: {
                            status: "FILLED",
                        },
                    });
                }
                const openItems = await tx.instantRequestItem.count({
                    where: {
                        requestId: item.requestId,
                        status: "OPEN",
                    },
                });
                if (openItems === 0) {
                    await tx.instantRequest.update({
                        where: {
                            id: item.requestId,
                        },
                        data: {
                            status: "FILLED",
                        },
                    });
                }
                const finalItem = await tx.instantRequestItem.findUnique({
                    where: {
                        id: itemId,
                    },
                });
                return {
                    item: finalItem,
                    providerUserId: item.request.providerId,
                    workerUserId: worker.userId,
                    bookingId: booking.id,
                };
            });
            await CacheInvalidationService.afterInstantRequestAccepted(result.providerUserId, result.workerUserId);
            const io = getIO();
            io.to(`user:${result.providerUserId}`).emit("bookingUpdated", {
                id: result.bookingId,
                status: "accepted",
                workerId: worker.id,
                requestId: result.item?.requestId,
                itemId,
            });
            // Notify worker of confirmation
            io.to(`user:${result.workerUserId}`).emit("instant-request:matched");
            return {
                ...result.item,
                bookingId: result.bookingId,
            };
        }
        finally {
            await RedisService.releaseLock(lockKey, lockToken);
        }
    }
    static async getMyRequests(userId) {
        const provider = await prisma.providerProfile.findUnique({
            where: {
                userId,
            },
        });
        if (!provider) {
            throw new Error("Provider profile not found");
        }
        const requests = await prisma.instantRequest.findMany({
            where: {
                providerId: userId,
            },
            select: {
                id: true,
                title: true,
                amount: true,
                status: true,
                createdAt: true,
                items: {
                    select: {
                        id: true,
                        requiredWorkers: true,
                        acceptedWorkers: true,
                        skill: {
                            select: {
                                name: true,
                            },
                        },
                        responses: {
                            select: {
                                status: true,
                                worker: {
                                    select: {
                                        user: {
                                            select: {
                                                name: true,
                                                phone: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        return requests;
    }
    static async submitBid(userId, requestId, bidAmount) {
        const worker = await prisma.workerProfile.findUnique({
            where: { userId },
            include: { skills: true, user: true }
        });
        if (!worker) {
            throw new Error("Worker profile not found");
        }
        if (!worker.isAvailable || !worker.user.isActive) {
            throw new Error("Worker is not available to place bids");
        }
        const request = await prisma.instantRequest.findUnique({
            where: { id: requestId }
        });
        if (!request) {
            throw new Error("Instant request not found");
        }
        if (request.bookingMode !== "BIDDING") {
            throw new Error("This request does not support bidding");
        }
        if (request.status !== "OPEN") {
            throw new Error("Bidding for this request is closed");
        }
        if (request.expiresAt < new Date()) {
            throw new Error("Bidding for this request has expired");
        }
        // Enforce 20% max discount rule
        const minBid = 0.80 * request.amount;
        const maxBid = request.amount;
        if (bidAmount < minBid || bidAmount > maxBid) {
            throw new Error(`Bid amount must be between ₹${Math.round(minBid)} and ₹${maxBid}`);
        }
        const bid = await prisma.$transaction(async (tx) => {
            return await tx.instantRequestBid.upsert({
                where: {
                    instantRequestId_workerId: {
                        instantRequestId: requestId,
                        workerId: worker.id
                    }
                },
                create: {
                    instantRequestId: requestId,
                    workerId: worker.id,
                    bidAmount,
                    status: "ACTIVE"
                },
                update: {
                    bidAmount,
                    status: "ACTIVE"
                },
                include: {
                    worker: {
                        include: {
                            user: true
                        }
                    }
                }
            });
        });
        // Notify provider of the live bid via Socket.IO
        const io = getIO();
        io.to(`user:${request.providerId}`).emit("instant-bidding:bid-submitted", {
            bidId: bid.id,
            instantRequestId: bid.instantRequestId,
            bidAmount: bid.bidAmount,
            workerName: bid.worker.user.name,
            rating: 4.8, // Mocked rating profile
            experience: bid.worker.experience,
            totalJobs: 12, // Mocked jobs completed
        });
        return bid;
    }
    static async selectBid(userId, requestId, bidId) {
        const lockKey = `lock:instant-bid-select:${requestId}`;
        const lockToken = await RedisService.acquireLock(lockKey, 15);
        if (!lockToken) {
            throw new Error("Another transaction is processing this request selection.");
        }
        try {
            const result = await prisma.$transaction(async (tx) => {
                const request = await tx.instantRequest.findUnique({
                    where: { id: requestId }
                });
                if (!request) {
                    throw new Error("Instant request not found");
                }
                if (request.providerId !== userId) {
                    throw new Error("You are not authorized to manage this request");
                }
                if (request.status !== "OPEN") {
                    throw new Error("This request is no longer open for selection");
                }
                const bid = await tx.instantRequestBid.findUnique({
                    where: { id: bidId },
                    include: { worker: { include: { user: true } } }
                });
                if (!bid || bid.instantRequestId !== requestId) {
                    throw new Error("Bid not found or doesn't belong to this request");
                }
                if (bid.status !== "ACTIVE") {
                    throw new Error("This bid is no longer active");
                }
                // Recheck worker availability
                if (!bid.worker.isAvailable || !bid.worker.user.isActive) {
                    throw new Error("This worker is no longer available");
                }
                const startOtp = Math.floor(1000 + Math.random() * 9000).toString();
                // Create booking with selected bid amount
                const booking = await tx.booking.create({
                    data: {
                        providerId: request.providerId,
                        workerId: bid.workerId,
                        instantRequestId: request.id,
                        amount: bid.bidAmount,
                        status: "CONFIRMED",
                        startOtp
                    }
                });
                // Set statuses
                await tx.instantRequestBid.update({
                    where: { id: bidId },
                    data: { status: "SELECTED" }
                });
                await tx.instantRequestBid.updateMany({
                    where: {
                        instantRequestId: requestId,
                        id: { not: bidId }
                    },
                    data: { status: "REJECTED" }
                });
                await tx.instantRequest.update({
                    where: { id: requestId },
                    data: { status: "FILLED" }
                });
                // Mark worker unavailable
                await tx.workerProfile.update({
                    where: { id: bid.workerId },
                    data: { isAvailable: false }
                });
                // Sync Redis availability removal
                const workerSkills = await tx.workerSkill.findMany({
                    where: { workerId: bid.workerId }
                });
                for (const ws of workerSkills) {
                    await RedisService.geoRemove(`geo:instant-workers:${ws.skillId}`, bid.workerId);
                }
                return {
                    bookingId: booking.id,
                    providerUserId: request.providerId,
                    workerUserId: bid.worker.userId
                };
            });
            // Socket notifies
            const io = getIO();
            io.to(`user:${result.providerUserId}`).emit("instant-bidding:closed");
            io.to(`user:${result.workerUserId}`).emit("instant-request:matched");
            return result;
        }
        finally {
            await RedisService.releaseLock(lockKey, lockToken);
        }
    }
}
//# sourceMappingURL=instant-request.service.js.map
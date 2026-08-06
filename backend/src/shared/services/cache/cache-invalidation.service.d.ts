export declare class CacheInvalidationService {
    static afterJobCreated(providerUserId: string): Promise<void>;
    static afterJobAccepted(providerUserId: string, workerUserId?: string | null, agentUserId?: string | null): Promise<void>;
    static afterBookingCompleted(providerUserId: string, workerUserId: string): Promise<void>;
    static afterReviewAdded(workerUserId: string): Promise<void>;
    static afterInstantRequestCreated(providerUserId: string): Promise<void>;
    static afterInstantRequestAccepted(providerUserId: string, workerUserId: string): Promise<void>;
    static afterInstantRequestCompleted(providerUserId: string, workerUserId: string): Promise<void>;
}
//# sourceMappingURL=cache-invalidation.service.d.ts.map
export declare class FareService {
    static calculateInstantFare(items: {
        skillId: string;
        requiredWorkers: number;
    }[]): Promise<{
        subtotal: number;
        platformFee: number;
        total: number;
    }>;
}
//# sourceMappingURL=fare.service.d.ts.map
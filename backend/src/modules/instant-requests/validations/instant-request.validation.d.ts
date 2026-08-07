import { z } from "zod";
export declare const createInstantRequestSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
    address: z.ZodOptional<z.ZodString>;
    amount: z.ZodOptional<z.ZodNumber>;
    bookingMode: z.ZodEnum<{
        DIRECT: "DIRECT";
        BIDDING: "BIDDING";
    }>;
    quoteId: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        skillId: z.ZodUUID;
        requiredWorkers: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const calculateFareSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        skillId: z.ZodUUID;
        requiredWorkers: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type CalculateFareInput = z.infer<typeof calculateFareSchema>;
export type CreateInstantRequestInput = z.infer<typeof createInstantRequestSchema>;
//# sourceMappingURL=instant-request.validation.d.ts.map
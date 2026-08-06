import { z } from "zod";
export declare const createJobSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    skillId: z.ZodUUID;
    requiredWorkers: z.ZodNumber;
    budget: z.ZodOptional<z.ZodNumber>;
    latitude: z.ZodOptional<z.ZodNumber>;
    longitude: z.ZodOptional<z.ZodNumber>;
    address: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    pincode: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export declare const applyJobSchema: z.ZodObject<{
    bidAmount: z.ZodNumber;
    workerCount: z.ZodOptional<z.ZodNumber>;
    message: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ApplyJobInput = z.infer<typeof applyJobSchema>;
//# sourceMappingURL=job.validation.d.ts.map
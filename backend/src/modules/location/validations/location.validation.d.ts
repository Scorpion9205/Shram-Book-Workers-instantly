import { z } from "zod";
export declare const updateLocationSchema: z.ZodObject<{
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
}, z.core.$strip>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
//# sourceMappingURL=location.validation.d.ts.map
import { z } from "zod";
export const updateLocationSchema = z.object({
    latitude: z.number(),
    longitude: z.number(),
});
//# sourceMappingURL=location.validation.js.map
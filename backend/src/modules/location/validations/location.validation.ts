import { z } from "zod";

export const updateLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

export type UpdateLocationInput =
  z.infer<typeof updateLocationSchema>;
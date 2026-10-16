import { z } from "zod";

// Body for "update my location": valid GPS ranges only (lat -90..90, lng -180..180).
export const updateLocationSchema = z.object({
  latitude: z.number().min(-90, "Invalid latitude").max(90, "Invalid latitude"),
  longitude: z.number().min(-180, "Invalid longitude").max(180, "Invalid longitude"),
});

export type UpdateLocationInput =
  z.infer<typeof updateLocationSchema>;
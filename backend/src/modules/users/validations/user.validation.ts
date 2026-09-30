import {z} from "zod"

export const updateProfileSchema = z.object({
    name:z.string().min(3).max(100, "Name must be at most 100 characters").optional(),
    email:z.email().optional(),
    address:z.string().max(300, "Address must be at most 300 characters").optional(),
    city:z.string().max(100, "City must be at most 100 characters").optional(),
    state:z.string().max(100, "State must be at most 100 characters").optional(),
    pincode:z.string().max(20, "Pincode must be at most 20 characters").optional(),
    profileImage:z.string().max(2048, "Profile image value is too long").optional(),
})

export type UpdateProfileInput =
  z.infer<typeof updateProfileSchema>;

export const changePasswordSchema =
  z.object({
    oldPassword: z
      .string()
      .min(8),

    newPassword: z
      .string()
      .min(8),
  });
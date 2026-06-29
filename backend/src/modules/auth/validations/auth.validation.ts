import {z} from "zod";
export const signupSchema = z.object({
    name:z
    .string()
    .min(3,"Name must be at least 3 characters")
    .max(50,"Name cannot exceed 50 characters"),

    phone:z
    .string()
    .regex(/^[0-9]{10}$/,"Phone number must be exactly 10 digits"),

    email:z
    .email("Invalid email format")
    .optional(),

    password:z
    .string()
    .min(8,"Password must be at least 8 characters")
    .max(20,"Password cannot exceed 20 characters"),

    role:z.enum([
        "WORKER",
        "PROVIDER",
        "AGENT"
    ])
})

export const loginSchema = z.object({
    identifier:z
    .string()
    .min(1,"Phone or Email is required"),

    password:z
    .string()
    .min(8,"Password must be at least 8 characters")
});

export const forgotPasswordSchema =
  z.object({

    email:
      z
        .string()
        .email("Invalid email"),

  });

export const resetPasswordSchema =
  z.object({

    token:
      z
        .string()
        .min(1),

    password:
      z
        .string()
        .min(
          8,
          "Password must be at least 8 characters"
        ),

  });

  export const sendOTPSchema = z.object({
  identifier: z.string().min(1, "Identifier is required"),
});

export const verifyOTPSchema = z.object({
  identifier: z.string().min(1, "Identifier is required"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});
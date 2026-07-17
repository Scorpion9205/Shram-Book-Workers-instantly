import { z } from "zod";

const phoneRegex = /^[6-9]\d{9}$/;

export const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    role: z.enum(["worker", "provider", "agent"], { message: "Select a role" }),
    phone: z.string().regex(phoneRegex, "Enter a valid 10-digit Indian phone number"),
   email: z
  .string()
  .min(1, "Email is required")
  .email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupFormValues = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  identifier: z.string().min(3, "Enter your phone or email"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const otpSchema = z.object({
  otp: z.string().length(6, "Enter the 6-digit code"),
});

export type OtpFormValues = z.infer<typeof otpSchema>;

export const forgotPasswordSchema = z.object({
  identifier: z.string().min(3, "Enter your phone or email"),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

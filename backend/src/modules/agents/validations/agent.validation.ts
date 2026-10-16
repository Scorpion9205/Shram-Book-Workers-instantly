import { z } from "zod";

export const createAgentProfileSchema = z.object({
  agencyName: z
    .string()
    .trim()
    .min(3, "Agency name must be at least 3 characters.")
    .max(100, "Agency name cannot exceed 100 characters."),

  description: z
    .string()
    .trim()
    .max(500, "Description cannot exceed 500 characters.")
    .optional(),
});

export type CreateAgentProfileInput = z.infer<
  typeof createAgentProfileSchema
>;

export const updateAgentProfileSchema =
  createAgentProfileSchema.partial();

export type UpdateAgentProfileInput = z.infer<
  typeof updateAgentProfileSchema
>;

// Agent-managed worker roster — for workers who have no smartphone and are onboarded by the
// Agent in person, so `phone` is optional (unlike normal self-signup, which requires it).
export const createManagedWorkerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/, "Phone number must be exactly 10 digits.")
    .optional()
    .nullable(),
  skillIds: z.array(z.string().uuid()).min(1, "Select at least one skill."),
  dailyRate: z.number().positive().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export type CreateManagedWorkerInput = z.infer<typeof createManagedWorkerSchema>;

// Availability toggle. Location is optional, but if one coordinate is sent the other must be too.
export const setWorkerAvailabilitySchema = z
  .object({
    isAvailable: z.boolean(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  })
  .refine(
    (data) => (data.latitude === undefined) === (data.longitude === undefined),
    { message: "latitude and longitude must be provided together.", path: ["latitude"] },
  );

export const setWorkerVerifiedSchema = z.object({
  verified: z.boolean(),
});

// Bank details for bank-transfer payouts. IFSC format: 4 letters, a zero, then 6 letters/digits.
export const setWorkerBankDetailsSchema = z.object({
  accountHolderName: z.string().trim().min(2, "Account holder name is required.").max(100),
  accountNumber: z.string().trim().min(6, "Enter a valid account number.").max(30),
  ifscCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid IFSC code."),
  bankName: z.string().trim().min(2, "Bank name is required.").max(100),
});

// How the agent actually paid the worker outside the app.
export const payoutWorkerSchema = z.object({
  method: z.enum(["CASH", "BANK_TRANSFER"]),
});

// Body for assigning a roster worker (used for both job applications and instant-request items).
export const assignWorkerSchema = z.object({
  workerId: z.string().uuid(),
});

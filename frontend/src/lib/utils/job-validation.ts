import { z } from "zod";

export const instantHireSchema = z.object({
  workerType: z.string().min(1, "Select a worker type"),
  address: z.string().min(5, "Enter a valid address"),
  amount: z.number().optional(),
  notes: z.string().optional(),
  workersNeeded: z.coerce.number().min(1).max(20),
});

export type InstantHireFormValues = z.infer<typeof instantHireSchema>;

export const createJobSchema = z.object({
  title: z.string().min(4, "Title must be at least 4 characters"),

  description: z.string().min(20, "Description must be at least 20 characters"),

  skillId: z.string().uuid("Please select a skill"),
  date: z.string().min(1, "Select a date"),
  address: z.string().min(5, "Enter a valid address"),

  salary: z.coerce.number().min(100, "Minimum salary is ₹100"),

  workersRequired: z.coerce.number().min(1).max(50),
});

export type CreateJobFormValues = z.infer<typeof createJobSchema>;

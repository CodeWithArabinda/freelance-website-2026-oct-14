import { z } from "zod";

export const CreateJobSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(120),
  description: z.string().min(20, "Description must be at least 20 characters"),
  category: z.string().min(2, "Category is required"),
  budgetMinor: z
    .number()
    .int("Budget must be an integer minor unit (cents)")
    .positive("Budget must be positive")
    .min(500, "Minimum budget is $5.00 (500 cents)"),
  skillsRequired: z.array(z.string()).min(1, "At least one skill is required"),
});

export const CreateProposalSchema = z.object({
  bidAmountMinor: z
    .number()
    .int("Bid amount must be an integer minor unit (cents)")
    .positive("Bid amount must be positive")
    .min(500, "Minimum bid is $5.00 (500 cents)"),
  coverLetter: z.string().min(30, "Cover letter must be at least 30 characters"),
  estimatedDays: z.number().int().positive().max(365, "Estimated duration must be within a year"),
});

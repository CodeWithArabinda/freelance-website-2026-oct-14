import { z } from "zod";

export const SubmitWorkSchema = z.object({
  notes: z.string().min(10, "Submission notes must be at least 10 characters"),
  attachmentUrls: z.array(z.string().url("Must be valid URL")).optional().default([]),
});

export const FileDisputeSchema = z.object({
  reason: z.string().min(20, "Dispute reason must be at least 20 characters"),
});

export const ResolveDisputeSchema = z.object({
  resolution: z.enum(["RELEASE_TO_FREELANCER", "REFUND_TO_CLIENT"]),
  resolutionNotes: z.string().min(10, "Resolution notes are required"),
});

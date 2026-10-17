export type Role = "CLIENT" | "FREELANCER" | "ADMIN";

export type AccountStatus = "ACTIVE" | "SUSPENDED";

export type JobStatus = "OPEN" | "IN_SELECTION" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type ProposalStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";

export type ContractStatus =
  | "CREATED"
  | "FUNDED_SIMULATED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "APPROVED"
  | "RELEASED_SIMULATED"
  | "DISPUTED"
  | "REFUNDED_SIMULATED"
  | "CANCELLED";

export type MilestoneStatus =
  | "PENDING"
  | "FUNDED_SIMULATED"
  | "SUBMITTED"
  | "APPROVED"
  | "RELEASED_SIMULATED"
  | "DISPUTED"
  | "REFUNDED_SIMULATED";

export type EscrowStatus = "HOLDING" | "RELEASED" | "REFUNDED";

export type LedgerAccountType =
  | "CLIENT_AVAILABLE"
  | "CLIENT_ESCROW_LOCKED"
  | "FREELANCER_AVAILABLE"
  | "PLATFORM_ESCROW_HOLDING"
  | "PLATFORM_FEE_REVENUE";

export type LedgerReferenceType =
  | "SIMULATED_DEPOSIT"
  | "ESCROW_LOCK"
  | "ESCROW_RELEASE"
  | "ESCROW_REFUND"
  | "PLATFORM_FEE";

export type DisputeStatus = "OPEN" | "RESOLVED_RELEASE" | "RESOLVED_REFUND";

export interface SessionPayload {
  userId: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface ClientProfileDTO {
  id: string;
  userId: string;
  companyName: string | null;
  website: string | null;
  description: string | null;
  totalSpentMinor: number;
}

export interface FreelancerProfileDTO {
  id: string;
  userId: string;
  headline: string | null;
  bio: string | null;
  hourlyRateMinor: number;
  skills: string[];
  totalEarnedMinor: number;
}

# TCC Freelance (PROJECT FREELANCE) — Domain Model Specification

**Status:** Approved Specification  
**Version:** 0.1.0  

---

## 1. Domain Entities & Relationships

### 1.1 Identity & Access
- **User**: The platform account actor.
  - Fields: `id`, `email`, `passwordHash`, `role` (`CLIENT`, `FREELANCER`, `ADMIN`), `fullName`, `createdAt`, `updatedAt`, `status` (`ACTIVE`, `SUSPENDED`).
- **ClientProfile**: Attached 1:1 to User with role `CLIENT`.
  - Fields: `id`, `userId`, `companyName`, `website`, `description`, `totalSpentMinor`.
- **FreelancerProfile**: Attached 1:1 to User with role `FREELANCER`.
  - Fields: `id`, `userId`, `headline`, `bio`, `hourlyRateMinor`, `skills`, `totalEarnedMinor`.

### 1.2 Marketplace
- **Job**: A listing published by a Client.
  - Fields: `id`, `clientId`, `title`, `description`, `budgetMinor`, `category`, `status` (`OPEN`, `IN_SELECTION`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), `skillsRequired` (JSON/string array), `createdAt`, `updatedAt`.
- **Proposal**: An offer made by a Freelancer on a Job.
  - Fields: `id`, `jobId`, `freelancerId`, `bidAmountMinor`, `coverLetter`, `estimatedDays`, `status` (`PENDING`, `ACCEPTED`, `REJECTED`, `WITHDRAWN`), `createdAt`.
- **Contract**: A binding engagement between Client and Freelancer resulting from an accepted Proposal.
  - Fields: `id`, `jobId`, `clientId`, `freelancerId`, `proposalId`, `title`, `totalAmountMinor`, `status` (`CREATED`, `FUNDED_SIMULATED`, `IN_PROGRESS`, `SUBMITTED`, `APPROVED`, `RELEASED_SIMULATED`, `DISPUTED`, `REFUNDED_SIMULATED`, `CANCELLED`), `createdAt`, `updatedAt`.
- **Milestone**: Breakdown of work and escrow allocations for a Contract.
  - Fields: `id`, `contractId`, `title`, `description`, `amountMinor`, `orderIndex`, `status` (`PENDING`, `FUNDED_SIMULATED`, `SUBMITTED`, `APPROVED`, `RELEASED_SIMULATED`, `DISPUTED`, `REFUNDED_SIMULATED`), `dueDate`.
- **WorkSubmission**: Proof of work delivered by Freelancer for a Milestone or Contract.
  - Fields: `id`, `milestoneId`, `contractId`, `freelancerId`, `notes`, `attachmentUrls` (JSON/string array), `status` (`SUBMITTED`, `ACCEPTED`, `REJECTED`), `submittedAt`.
- **Review**: Bilateral feedback left after a contract is approved.
  - Fields: `id`, `contractId`, `authorId`, `targetId`, `rating` (1-5), `feedback`, `createdAt`.

### 1.3 Escrow & Double-Entry Accounting
- **EscrowRecord**: Tracks the allocated simulated custody for a Contract or Milestone.
  - Fields: `id`, `contractId`, `milestoneId`, `amountMinor`, `status` (`HOLDING`, `RELEASED`, `REFUNDED`), `fundedAt`, `releasedAt`, `refundedAt`.
- **LedgerAccount**: Represents an internal accounting bucket.
  - Types: `CLIENT_AVAILABLE`, `CLIENT_ESCROW_LOCKED`, `FREELANCER_AVAILABLE`, `PLATFORM_ESCROW_HOLDING`.
  - Fields: `id`, `userId`, `accountType`, `balanceMinor`, `updatedAt`.
- **LedgerEntry**: Immutable double-entry transaction record.
  - Fields: `id`, `contractId`, `debitAccountId`, `creditAccountId`, `amountMinor`, `referenceType` (`SIMULATED_DEPOSIT`, `ESCROW_LOCK`, `ESCROW_RELEASE`, `ESCROW_REFUND`), `description`, `createdAt`.
- **Dispute**: Formal arbitration request filed on a contract.
  - Fields: `id`, `contractId`, `initiatorId`, `reason`, `status` (`OPEN`, `RESOLVED_RELEASE`, `RESOLVED_REFUND`), `resolutionNotes`, `resolvedById`, `createdAt`, `resolvedAt`.

### 1.4 Platform Operations
- **AuditEvent**: Immutable security and activity log.
  - Fields: `id`, `actorId`, `action`, `entityType`, `entityId`, `payload` (JSON), `createdAt`.
- **Notification**: In-app notifications for workflow updates.
  - Fields: `id`, `userId`, `title`, `message`, `link`, `isRead`, `createdAt`.

---

## 2. Escrow State Machine Transition Matrix

| Current State | Transition Event | Permitted Actor | Target State | Invariant Guards |
| :--- | :--- | :--- | :--- | :--- |
| `CREATED` | `FUND_ESCROW` | Client (Owner) | `FUNDED_SIMULATED` | Contract is active; Client has not funded yet; Creates EscrowRecord & Ledger Entries |
| `FUNDED_SIMULATED` | `START_WORK` | Freelancer (Owner) | `IN_PROGRESS` | Contract is funded; Freelancer acknowledges start |
| `IN_PROGRESS` | `SUBMIT_WORK` | Freelancer (Owner) | `SUBMITTED` | Valid submission notes provided; WorkSubmission recorded |
| `SUBMITTED` | `APPROVE_WORK` | Client (Owner) | `APPROVED` | Client reviews submission |
| `APPROVED` | `RELEASE_FUNDS` | Client (Owner) | `RELEASED_SIMULATED` | Escrow moved from platform custody to Freelancer balance via ledger |
| Any (Pre-Release) | `FILE_DISPUTE` | Client or Freelancer | `DISPUTED` | Contract funded and not yet released/refunded |
| `DISPUTED` | `RESOLVE_RELEASE` | Admin | `RELEASED_SIMULATED` | Dispute resolved in favor of Freelancer |
| `DISPUTED` | `RESOLVE_REFUND` | Admin | `REFUNDED_SIMULATED` | Dispute resolved in favor of Client |
| `FUNDED_SIMULATED` | `MUTUAL_REFUND`| Client & Admin | `REFUNDED_SIMULATED` | No work delivered or mutual agreement |

# TCC Freelance (PROJECT FREELANCE) — API Contracts Specification

**Status:** Approved Specification  
**Version:** 0.1.0  
**Transport:** JSON over HTTPS (Next.js App Router Route Handlers & Server Actions)  

---

## 1. Authentication & Session

### `POST /api/auth/register`
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "fullName": "Alice Smith",
    "role": "CLIENT" // or "FREELANCER"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "user": { "id": "usr_...", "email": "user@example.com", "role": "CLIENT", "fullName": "Alice Smith" }
  }
  ```
- **Sets Cookie:** `tcc_session=<jwt_token>; HttpOnly; SameSite=Lax; Path=/`

### `POST /api/auth/login`
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response `200 OK`:** Returns user profile and sets session cookie.

### `POST /api/auth/logout`
- **Response `200 OK`:** Clears session cookie.

### `GET /api/auth/me`
- **Response `200 OK`:** Returns currently authenticated user with profile and ledger balance summaries.

---

## 2. Marketplace Operations

### `GET /api/jobs`
- **Query Params:** `query`, `category`, `status`, `minBudget`, `maxBudget`, `page`, `limit`
- **Response `200 OK`:** List of jobs with client summary and proposal counts.

### `POST /api/jobs`
- **Auth:** Required (`CLIENT`)
- **Request Body:**
  ```json
  {
    "title": "Build a responsive Next.js marketplace",
    "description": "Full description of work required...",
    "category": "Web Development",
    "budgetMinor": 50000, // $500.00
    "skillsRequired": ["Next.js", "TypeScript", "Tailwind CSS"]
  }
  ```
- **Response `201 Created`:** Created Job object.

### `GET /api/jobs/:id`
- **Response `200 OK`:** Full job details, skills, client information, and proposals (if caller is the owner).

### `POST /api/jobs/:id/proposals`
- **Auth:** Required (`FREELANCER`)
- **Request Body:**
  ```json
  {
    "bidAmountMinor": 45000, // $450.00
    "coverLetter": "I have 5 years experience with Next.js...",
    "estimatedDays": 7
  }
  ```
- **Response `201 Created`:** Proposal object.

### `POST /api/proposals/:id/accept`
- **Auth:** Required (`CLIENT` owning the job)
- **Effect:** Creates a Contract and initializes default Milestone in `CREATED` state. Updates proposal status to `ACCEPTED`.
- **Response `200 OK`:** Created Contract and Milestone details.

---

## 3. Contract & Escrow Operations

### `POST /api/contracts/:id/fund`
- **Auth:** Required (`CLIENT` owning the contract)
- **Request Body:** `{}`
- **Preconditions:** Contract status is `CREATED`.
- **State Transition:** `CREATED` -> `FUNDED_SIMULATED`.
- **Side Effects:**
  - Creates/updates `EscrowRecord` (status: `HOLDING`).
  - Records debit on `CLIENT_AVAILABLE` and credit on `PLATFORM_ESCROW_HOLDING`.
  - Emits `AuditEvent` (`ESCROW_FUNDED_SIMULATED`).
- **Response `200 OK`:** Updated Contract and Escrow status.

### `POST /api/contracts/:id/submit`
- **Auth:** Required (`FREELANCER` owning the contract)
- **Request Body:**
  ```json
  {
    "notes": "Work completed per specifications. Deliverables uploaded.",
    "attachmentUrls": ["https://github.com/example/repo"]
  }
  ```
- **Preconditions:** Contract status is `FUNDED_SIMULATED` or `IN_PROGRESS`.
- **State Transition:** `-> SUBMITTED`.
- **Response `200 OK`:** Created `WorkSubmission` and updated Contract status.

### `POST /api/contracts/:id/approve`
- **Auth:** Required (`CLIENT` owning the contract)
- **Request Body:** `{}`
- **Preconditions:** Contract status is `SUBMITTED`.
- **State Transition:** `SUBMITTED` -> `APPROVED` -> `RELEASED_SIMULATED`.
- **Side Effects:**
  - Escrow status updated to `RELEASED`.
  - Records debit on `PLATFORM_ESCROW_HOLDING` and credit on `FREELANCER_AVAILABLE`.
  - Emits `AuditEvent` (`ESCROW_RELEASED_SIMULATED`).
- **Response `200 OK`:** Updated Contract, EscrowRecord, and release receipt.

### `POST /api/contracts/:id/dispute`
- **Auth:** Required (`CLIENT` or `FREELANCER` on the contract)
- **Request Body:**
  ```json
  {
    "reason": "Milestone requirements were not met as agreed."
  }
  ```
- **Preconditions:** Contract status is `FUNDED_SIMULATED`, `IN_PROGRESS`, or `SUBMITTED`.
- **State Transition:** `-> DISPUTED`.
- **Response `201 Created`:** Created Dispute record.

### `POST /api/admin/disputes/:id/resolve`
- **Auth:** Required (`ADMIN`)
- **Request Body:**
  ```json
  {
    "resolution": "RELEASE_TO_FREELANCER" // or "REFUND_TO_CLIENT",
    "resolutionNotes": "Reviewed deliverables and commit history."
  }
  ```
- **Response `200 OK`:** Updated Dispute, Contract, and simulated ledger entry.

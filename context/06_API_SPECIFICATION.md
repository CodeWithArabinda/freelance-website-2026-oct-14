# 06 — API Architecture & Versioned Contract Standards

## 1. REST API Standards (`/api/v1`)

All client, mobile, and worker communications utilize standard JSON over HTTPS adhering to OpenAPI 3.1 specifications.

- **Base Route:** `/api/v1`
- **Authentication:** Stateless signed JWT session cookie (`tcc_session`, HttpOnly, Secure, SameSite=Lax) or Bearer header for worker API clients.
- **Idempotency:** All state-changing payment and contract requests require an `Idempotency-Key` header (UUIDv4).

---

## 2. API Endpoint Catalog

### 2.1 Identity & Wallet Authentication
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Create client or freelancer account | Public |
| `POST` | `/api/v1/auth/login` | Authenticate with email/password | Public |
| `POST` | `/api/v1/auth/logout` | Revoke session cookie | Authenticated |
| `GET` | `/api/v1/users/me` | Read active profile & balance summary | Authenticated |
| `PATCH`| `/api/v1/users/me` | Update allowed bio/organization fields | Authenticated |
| `GET` | `/api/v1/freelancers/:id` | Read public freelancer profile & portfolio | Public |
| `POST` | `/api/v1/wallet-connections/challenge` | Generate nonce for CrownPay signature | Authenticated |
| `POST` | `/api/v1/wallet-connections/verify` | Verify signed challenge & link address | Authenticated |

### 2.2 Marketplace & Contracts
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/jobs` | Search & filter open job listings | Public |
| `POST` | `/api/v1/jobs` | Publish new client job listing | Client, Admin |
| `GET` | `/api/v1/jobs/:id` | Read job specifications & authorized proposals | Public / Owner |
| `POST` | `/api/v1/jobs/:id/proposals` | Submit proposal & milestone schedule | Freelancer |
| `POST` | `/api/v1/proposals/:id/accept` | Accept proposal & initiate contract | Job Client Owner |
| `POST` | `/api/v1/contracts/:id/accept` | Mutually confirm contract terms version | Contract Party |
| `POST` | `/api/v1/milestones/:id/deliverables` | Upload work notes & object keys | Freelancer Owner |
| `POST` | `/api/v1/milestones/:id/revision-requests` | Request scope-aligned revisions | Client Owner |
| `POST` | `/api/v1/milestones/:id/approve` | Authorize delivery acceptance | Client Owner |
| `POST` | `/api/v1/milestones/:id/disputes` | Open formal arbitration dispute | Contract Party |

### 2.3 Payments, Escrow & Ledger
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/payment-methods` | List active networks (TCC, Crown Edge) | Public |
| `POST` | `/api/v1/payment-intents` | Create milestone funding intent | Client Owner |
| `GET` | `/api/v1/payment-intents/:id` | Read payment confirmation status | Intent Owner |
| `POST` | `/api/v1/payment-intents/:id/submit` | Register broadcast transaction reference | Intent Owner |
| `GET` | `/api/v1/milestones/:id/escrow` | Read current escrow lock & ledger status | Contract Party |
| `POST` | `/api/v1/milestones/:id/release-requests` | Trigger escrow release to freelancer | Client Owner |
| `POST` | `/api/v1/milestones/:id/refund-requests` | Request eligible pre-work refund | Client Owner |
| `GET` | `/api/v1/ledger` | Fetch account balances & double-entry journal | Authenticated |

### 2.4 Administrative Arbitration
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/disputes` | List all open arbitration cases | Admin Only |
| `POST` | `/api/v1/admin/disputes/:id/decisions` | Submit binding verdict (Release/Refund) | Admin Only |
| `GET` | `/api/v1/admin/payments/reconciliation` | Inspect ledger/chain discrepancies | Admin Only |
| `POST` | `/api/v1/admin/payments/:id/retry` | Retry stuck outbox or reconciliation job | Admin Only |
| `GET` | `/api/v1/admin/audit-events` | Query append-only compliance audit trail | Admin Only |

---

## 3. Standard Error Envelope & Codes

All errors return RFC 7807 problem details:

```json
{
  "code": "INVALID_STATE_TRANSITION",
  "message": "Cannot release funds while contract is in DISPUTED state.",
  "details": {
    "currentStatus": "DISPUTED",
    "requestedAction": "RELEASE_FUNDS",
    "requiredResolution": "ADMIN_ARBITRATION"
  },
  "timestamp": "2026-10-16T18:30:00Z"
}
```

### Core Error Codes
- `UNAUTHORIZED` (401): Missing or expired session token.
- `FORBIDDEN` (403): User does not own the requested resource (BOLA protection).
- `INVALID_STATE_TRANSITION` (400): Action violates Finite State Machine rules.
- `INSUFFICIENT_FUNDS` (400): Account or wallet balance below required escrow amount.
- `DUPLICATE_IDEMPOTENCY_KEY` (409): Request payload changed for existing key.
- `DISPUTE_ACTIVE` (400): Milestone is frozen under administrative arbitration.
- `CHAIN_UNCONFIRMED` (202): Transaction submitted but block finality pending.

# TCC Freelance (PROJECT FREELANCE)

**Product Name:** TCC Freelance  
**Internal Codename:** PROJECT FREELANCE  
**Version:** 0.1.0 (MVP Foundation)  
**Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Prisma ORM (SQLite / PostgreSQL-ready), Zod, Vitest.

---

## 1. Executive Summary

TCC Freelance is a milestone-based freelance marketplace engineered with a **Simulated Milestone Escrow Engine**. It connects Clients and Freelancers through enforceable milestone contracts, strict server-side Finite State Machine (FSM) transitions, and a balanced double-entry accounting ledger.

### Core Architectural Guarantees
- **Purely Simulated Escrow Sandbox**: No real money, live payment providers, custody, blockchain, or token settlement is introduced in this phase.
- **Finite State Machine (FSM)**: Enforces legal, server-side validated contract transitions (`CREATED → FUNDED_SIMULATED → IN_PROGRESS → SUBMITTED → APPROVED → RELEASED_SIMULATED`, with alternative branches for `DISPUTED` and `REFUNDED_SIMULATED`).
- **Integer Minor Currency Units**: All financial representations (budgets, bids, milestones, escrow holding, ledger balances) are strictly positive integers in cents (e.g., $100.00 is stored as `10000`). Floating-point arithmetic is forbidden.
- **Double-Entry Ledger Accounting**: Every escrow deposit, lock, release, or refund produces balanced opposing debit and credit entries in `LedgerAccount` and `LedgerEntry`.
- **Zero-Trust Validation**: All client and API inputs are validated using strict Zod schemas before touching domain modules.

---

## 2. Quickstart & Local Setup

### Prerequisites
- Node.js >= 18.17 (Tested on Node.js v26.2.0)
- `pnpm` (v11+) or `npm`

### Installation & Database Initialization

```bash
# 1. Install dependencies
pnpm install

# 2. Synchronize database schema (creates local SQLite dev.db)
pnpm db:push

# 3. Seed realistic demo accounts, jobs, and milestone contracts
pnpm db:seed

# 4. Start local development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 3. Seeded Demo Accounts

The database seed provides 3 preconfigured roles with quick 1-click login buttons in the UI:

| Role | Email | Password | Description |
| :--- | :--- | :--- | :--- |
| **Client** | `client@tcc.internal` | `Password123!` | Marcus Vance (Vance Digital Innovations). Seeded with $25,000.00 sandbox test funds. |
| **Freelancer** | `freelancer@tcc.internal` | `Password123!` | Elena Rostova (Senior Full-Stack Architect). |
| **Admin** | `admin@tcc.internal` | `Password123!` | Platform Arbitration Administrator. |

---

## 4. Automated Testing & Verification

The test suite validates domain invariants, unauthorized operations, race condition protections, and state transitions.

```bash
# Run all automated tests (Vitest)
pnpm test

# Run type check and production build
pnpm run build
```

### Verified Invariants:
1. Client cannot submit work on behalf of a freelancer.
2. Freelancer cannot release escrow funds to themselves.
3. Contracts cannot be funded twice (idempotency guard).
4. Disputed contracts cannot be released through the ordinary client approval path.
5. Released contracts cannot be released again.
6. Double-entry ledger debits and credits remain in exact balance after transitions and dispute arbitration.
7. Budget and bid inputs strictly reject floating-point numbers.
8. Tampered session tokens are rejected.

---

## 5. Architectural Documentation

Detailed architectural specifications and decision records are maintained in `/docs`:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — System topology, module boundaries, and architectural principles.
- [`docs/DOMAIN_MODEL.md`](docs/DOMAIN_MODEL.md) — Entity relationships and Escrow State Machine transition matrix.
- [`docs/API_CONTRACTS.md`](docs/API_CONTRACTS.md) — HTTP/JSON contracts and validation rules.
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — Architectural Decision Records (ADRs).

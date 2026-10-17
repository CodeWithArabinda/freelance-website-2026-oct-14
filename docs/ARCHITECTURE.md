# TCC Freelance (PROJECT FREELANCE) — System Architecture

**Product Name:** TCC Freelance  
**Internal Codename:** PROJECT FREELANCE  
**Version:** 0.1.0 (MVP Foundation)  
**Status:** Approved Architecture Baseline  

---

## 1. System Overview

TCC Freelance is a high-trust, milestone-driven freelance marketplace connecting Clients and Freelancers. At its core is a **Simulated Milestone Escrow Engine** that provides double-entry ledger audibility, rigid state transition machines, and role-based access control, while keeping the platform completely decoupled from any live custody, crypto token, or third-party payment rail during this initial phase.

```
+-----------------------------------------------------------------------------------+
|                                  Client Tier                                      |
|  Next.js 14 App Router + Tailwind CSS + Lucide Icons + Responsive Marketplace UI   |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          | HTTPS / JSON / Server Actions & APIs
                                          v
+-----------------------------------------------------------------------------------+
|                             Application & Domain Tier                             |
|                                                                                   |
|  +--------------------+   +-----------------------+   +------------------------+  |
|  |   Identity & Auth  |   |   Marketplace Core    |   | Simulated Escrow Engine|  |
|  | - JWT session      |   | - Jobs & Skills       |   | - Finite State Machine |  |
|  | - Role checks      |   | - Proposals & Offers  |   | - Atomic transitions   |  |
|  | - Password hashing |   | - Contracts           |   | - Double-entry ledger  |  |
|  +--------------------+   +-----------------------+   +------------------------+  |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                           Security & Audit Layer                            |  |
|  | - Input Validation (Zod)                                                    |  |
|  | - Ownership & Authorization Guards                                          |  |
|  | - Immutable Audit Logging                                                   |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          | Prisma ORM (Database Transactions)
                                          v
+-----------------------------------------------------------------------------------+
|                                Persistence Tier                                   |
|   Prisma Schema (SQLite local zero-dependency / PostgreSQL production-ready)       |
+-----------------------------------------------------------------------------------+
```

---

## 2. Module Boundaries & Ownership

The system is organized into modular domain boundaries under `src/`:

1. **`src/lib/auth/` (Identity & Access Boundary)**
   - Password hashing with bcrypt.
   - Secure stateless session tokens via signed JWT cookies (`jose`).
   - Session extraction, role-based authorization guards, and ownership enforcement.

2. **`src/lib/marketplace/` (Marketplace Core Boundary)**
   - Job listings lifecycle (`DRAFT`, `OPEN`, `IN_SELECTION`, `AWARDED`, `CLOSED`).
   - Proposals submission, status tracking (`PENDING`, `ACCEPTED`, `REJECTED`, `WITHDRAWN`).
   - Freelancer profiles, public portfolios, and skills taxonomy.

3. **`src/lib/escrow/` (Escrow & Accounting Boundary)**
   - Strict Finite State Machine (FSM) governing contracts and milestones.
   - Financial invariant enforcement:
     - All monetary values stored as positive integers in minor currency units (cents). Floating point arithmetic is strictly forbidden.
     - Double-entry simulated ledger (`LedgerAccount` and `LedgerEntry`) guaranteeing debit/credit balance.
     - Idempotency guards preventing duplicate funding, duplicate releases, or unauthorized refunds.
     - Complete separation from any specific monetary token or external payment rail.

4. **`src/lib/audit/` (Audit & Dispute Boundary)**
   - Centralized `AuditEvent` logger capturing actor, action, target entity, timestamp, IP, and metadata.
   - Dispute management workflow (`FILED`, `UNDER_REVIEW`, `RESOLVED_RELEASE`, `RESOLVED_REFUND`).

5. **`src/app/` (Presentation Tier - App Router)**
   - Server-rendered marketplace views with client-side interactive forms.
   - Connected directly to validated server operations (Route Handlers & Server Actions).

---

## 3. Core Architectural Invariants

1. **Server-Side Enforcement**: Presentation components never determine authorization or state transitions. Every mutation must validate caller identity, resource ownership, and valid prior state inside a database transaction.
2. **Integer Minor Units**: Currency values are always integers (e.g., \$100.00 is stored as `10000` cents).
3. **Escrow Simulation Boundary**: Simulated funds exist only in `LedgerEntry` and `EscrowRecord`. No withdrawal to real bank accounts or blockchain networks is supported or implied.
4. **Zero-Trust Input**: Every request payload is validated via Zod schemas before touching any domain logic.

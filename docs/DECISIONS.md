# TCC Freelance (PROJECT FREELANCE) — Architectural Decision Records (ADR)

## ADR 001: Next.js 14 App Router + TypeScript + Tailwind Architecture
- **Context:** The marketplace requires a responsive, high-performance web experience with server-side security enforcement and unified client/server types.
- **Decision:** Use Next.js 14 App Router with React Server Components, TypeScript with strict mode, and Tailwind CSS.
- **Consequences:** Eliminates API impedance mismatches, allows strict server-side validation on route handlers and actions, and provides rapid UI development.

## ADR 002: Prisma ORM with SQLite for Local Dev and Zero-Dependency Portability
- **Context:** The local Windows development environment does not have a live PostgreSQL daemon or Docker installed. Local setup, CI, and test execution must be 100% reproducible out of the box without external daemon dependencies.
- **Decision:** Use Prisma ORM with SQLite for local execution and automated testing (`file:./prisma/dev.db`), architecting all schema types (IDs, integers, JSON strings, enums) to be trivially portable to PostgreSQL in production environments.
- **Consequences:** Tests and development run instantly without setup friction. Financial minor units are strictly integer-based.

## ADR 003: Strict Integer Minor Units for Monetary Values
- **Context:** Storing monetary amounts in floating point numbers leads to catastrophic rounding and precision drift.
- **Decision:** All financial values (budgets, bids, milestones, escrow holding, ledger balances) must strictly be stored and manipulated as positive integers in minor currency units (cents, e.g. \$100.00 = `10000`).
- **Consequences:** Zero floating-point inaccuracy. Currency formatting is strictly an edge presentation concern.

## ADR 004: Explicit Simulated Escrow Finite State Machine (FSM)
- **Context:** Requirement 7 dictates that real money, custody, blockchain, or live payment gateways must NOT be introduced during this foundation phase, but the workflow must behave as an audit-grade escrow engine.
- **Decision:** Implement a deterministic Finite State Machine enforcing validated state transitions on the server (`CREATED -> FUNDED_SIMULATED -> IN_PROGRESS -> SUBMITTED -> APPROVED -> RELEASED_SIMULATED`), paired with a double-entry ledger (`LedgerAccount` and `LedgerEntry`) tracking test balances.
- **Consequences:** Complete isolation from live financial rails. Future payment adapters (Stripe, custody accounts, escrow rails) can be plugged in behind an abstract interface without rewriting the domain core.

## ADR 005: Stateless Signed JWT Session Authentication
- **Context:** Need secure, lightweight session handling with role checks (Client, Freelancer, Admin) without coupling to heavy external OAuth providers before deployment.
- **Decision:** Use `jose` with signed HttpOnly cookies (`tcc_session`) containing user ID, role, and email, verified on the server for all protected API routes. Passwords hashed with `bcryptjs`.
- **Consequences:** High security, tamper-proof sessions, zero external auth service downtime.

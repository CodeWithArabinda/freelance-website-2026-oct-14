# TCC Freelance — Engineering Context Repository

**Product Name:** TCC Freelance  
**Internal Codename:** PROJECT FREELANCE  
**Architecture Version:** 1.0 (Senior Software Engineering Blueprint)  
**Date:** October 2026  
**Status:** Living Engineering Context & Specification  

---

## Purpose of this Context Repository

This `context/` directory serves as the definitive technical source of truth for the architecture, domain logic, escrow mechanics, database schema, API contracts, security invariants, and blockchain integration protocols of **TCC Freelance**.

It isolates marketplace business logic from underlying payment rails, ensuring seamless operation on the initial **TCC prototype/testnet** while remaining architecturally decoupled and ready for production migration to **Crown Edge Technology** (Rust chain, native CROWN) and **CrownPay** (signing wallet).

---

## Directory Navigation

| File | Description |
| :--- | :--- |
| [**`00_OVERVIEW.md`**](./00_OVERVIEW.md) | Architectural thesis, core tenets, modular monolith strategy, and layer separation |
| [**`01_SYSTEM_ARCHITECTURE.md`**](./01_SYSTEM_ARCHITECTURE.md) | Component boundaries, subsystem topology, deployment infrastructure, and operational targets |
| [**`02_DOMAIN_WORKFLOWS.md`**](./02_DOMAIN_WORKFLOWS.md) | Client, Freelancer, and Administrator journeys, state machines, and end-to-end lifecycle |
| [**`03_ESCROW_AND_LEDGER.md`**](./03_ESCROW_AND_LEDGER.md) | Escrow custody models, double-entry ledger journals, balance invariants, and dispute arbitration |
| [**`04_BLOCKCHAIN_INTEGRATION.md`**](./04_BLOCKCHAIN_INTEGRATION.md) | TCC vs Crown Edge vs CrownPay boundaries, `ChainAdapter` & `EscrowProvider` interface contracts |
| [**`05_DATABASE_SCHEMA.md`**](./05_DATABASE_SCHEMA.md) | PostgreSQL entity relationship dictionary, 19 tables, integrity rules, and indexing strategy |
| [**`06_API_SPECIFICATION.md`**](./06_API_SPECIFICATION.md) | REST API v1 endpoints, idempotency semantics, payload schemas, and OWASP API Top 10 guards |
| [**`07_SECURITY_AND_RELIABILITY.md`**](./07_SECURITY_AND_RELIABILITY.md) | Failure recovery matrix, transactional outbox pattern, race-condition defenses, and test suite |
| [**`08_ROADMAP_AND_DECISIONS.md`**](./08_ROADMAP_AND_DECISIONS.md) | Phased development roadmap (Phases 01–06), release gates, and Architecture Decision Records (ADRs) |

---

## Key Architectural Invariants

1. **Decoupled Execution:** Client and freelancer workflows never depend directly on blockchain internals or synchronous node responses.
2. **Untrusted Frontend / Wallets:** The backend never treats a frontend submission, a wallet popup, or a transaction hash as proof of funded escrow.
3. **Integer Atomic Units:** No floating-point arithmetic for currency. All balances and transactions are stored as integer atomic minor units (e.g., Grains, cents).
4. **Double-Entry Balance:** Every financial movement creates balanced debit and credit ledger entries. Assets strictly equal liabilities plus platform equity.
5. **Deterministic State Transitions:** Contracts, payment intents, and blockchain operations are tracked via independent, synchronized finite state machines.

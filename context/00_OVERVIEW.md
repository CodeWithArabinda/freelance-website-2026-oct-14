# 00 — Architectural Overview & System Tenets

## 1. Executive Summary

**TCC Freelance** is an enterprise freelance marketplace engineered to connect clients with specialized digital talent, backed by a **dedicated payment orchestration layer**, an **immutable double-entry ledger**, an **enforceable escrow state machine**, and an **abstracted blockchain adapter**.

The core engineering thesis is:
> **The correct way to build this platform is as a freelance marketplace with a dedicated payment orchestration layer, a ledger-backed escrow state machine, and a blockchain adapter. Client and freelancer workflows must not depend directly on blockchain internals.**

The platform initially operates on the existing **TCC testnet/prototype**, keeping the system ready for seamless production migration to **Crown Edge Technology** (Rust blockchain) and **CrownPay** (signing wallet).

---

## 2. Core Architectural Decisions

| Decision | Recommended Design | Strategic Rationale |
| :--- | :--- | :--- |
| **Application Architecture** | **Modular Monolith First** | Guarantees ACID transactional consistency across contracts, milestones, and financial journals. Eliminates distributed transaction failures during early growth while preserving strict module boundaries for future service extraction. |
| **Frontend Framework** | **Next.js (App Router), React, TypeScript, Tailwind CSS** | Server-side rendering, strong typing, clean user experience, and full boundary separation between UI and business logic. |
| **Backend & Domain** | **Modular API with Strict Domain Boundaries** | Keeps business rules, authorization, and accounting strictly isolated from presentation and delivery protocols. |
| **Database** | **PostgreSQL** | Industry standard relational store for financial ledgers, row-level locking, foreign key integrity, and serializable transactions. (SQLite used locally for zero-dep development/testing). |
| **Async Processing** | **Transactional Outbox + Background Workers** | Prevents dual-write discrepancies between database commits and external event emission / chain submissions. |
| **File Delivery** | **Private Object Storage + Short-Lived Signed URLs** | Eliminates predictable public asset URLs. Ensures only authenticated, authorized contract participants access private deliverables and dispute evidence. |
| **Identity & Access** | **RBAC + Resource-Level Authorization (ABAC)** | Role-based checks combined with contextual ownership verification on every protected mutation. |
| **Payments & Escrow** | **Dedicated Payment Orchestrator + Double-Entry Ledger** | Single financial source of truth. Balances are derived from balanced debit/credit journals. Integer atomic minor units only. |
| **Blockchain** | **Chain Adapter Interface (TCC first, Crown Edge later)** | Completely decouples the core marketplace from blockchain-specific APIs, consensus mechanisms, gas fees, and network reorgs. |
| **Wallet Interaction** | **CrownPay Integration via Versioned Interface** | The wallet signs authorized transactions; it never decides whether a client or freelancer is authorized to release funds. |
| **Reliability** | **Idempotency Keys, Audit Trails, Reconciliation Loops, Retries** | Resilient against network drops, duplicate webhooks, worker crashes, and delayed block confirmations. |

---

## 3. Four-Tier Separation of Concerns

```
+-----------------------------------------------------------------------------------+
| 1. User Application Tier (Client Portal, Freelancer Portal, Admin Console)        |
+-----------------------------------------+-----------------------------------------+
                                          | HTTPS / REST v1 / Signed JWT
                                          v
+-----------------------------------------------------------------------------------+
| 2. Marketplace & Domain Tier (Jobs, Proposals, Contracts, Milestone Lifecycle)    |
+-----------------------------------------+-----------------------------------------+
                                          | Internal Domain Invocations
                                          v
+-----------------------------------------------------------------------------------+
| 3. Financial & Accounting Tier (Payment Orchestration, Double-Entry Ledger)       |
+-----------------------------------------+-----------------------------------------+
                                          | Transactional Outbox / Chain Adapter Interface
                                          v
+-----------------------------------------------------------------------------------+
| 4. Blockchain Execution Tier (TCC Prototype / Crown Edge / CrownPay Wallet)       |
+-----------------------------------------------------------------------------------+
```

### The Non-Negotiable Verification Rule
> **The marketplace backend must never treat a successful frontend response, a wallet popup, or an on-chain transaction submission as proof that funds have been secured.**
> 
> Escrow is confirmed only when the transaction achieves verified finality under the target network's confirmation policy, matched against an idempotent payment intent, and journaled into the double-entry ledger.

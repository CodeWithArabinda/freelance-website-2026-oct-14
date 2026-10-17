# 01 — System Architecture & Component Boundaries

## 1. System Subsystems and Responsibilities

The system is factored into distinct domains with strictly documented responsibilities:

| Subsystem | Primary Responsibilities | Strict Anti-Patterns (Forbidden) |
| :--- | :--- | :--- |
| **Client Portal** | Post jobs, evaluate proposals, fund milestones, inspect deliverables, authorize releases, dispute claims. | Storing private keys; assuming payment submission implies confirmed funding. |
| **Freelancer Portal** | Discover jobs, submit milestone bids, track active contracts, upload deliverables to signed URLs. | Modifying contract states without verified backend authorization; direct escrow release requests. |
| **Admin Console** | Moderate listings, audit identity verification, arbitrate formal disputes, review ledger reconciliation exceptions. | Direct arbitrary balance editing buttons; bypassing audit logs or four-eyes authorization. |
| **CrownPay Wallet** | Connection handshake, receiving addresses, presenting payment requests, cryptographic transaction signing. | Managing marketplace business logic; deciding whether a milestone is approved. |
| **Marketplace Core** | Job taxonomy, proposal matching, contractor search, bilateral reviews, public profiles. | Managing ledger entries or communicating directly with blockchain nodes. |
| **Contract Engine** | State machine governing contracts, milestones, and deliverable version history. | Floating point arithmetic; modifying agreed terms without a signed version amendment. |
| **Payment Orchestrator** | Payment intent generation, idempotency deduplication, timeout handling, settlement commands. | Trusting external webhook data without cryptographic signature verification. |
| **Double-Entry Ledger** | Immutable journal posting, chart of accounts, debit/credit balancing, platform fee accrual. | Compensating entries through deletion; updating historical records silently. |
| **Chain Adapter** | Network transaction submission, block finality polling, RPC response normalization, chain reorg detection. | Exposing chain-specific opcode or gas models to the marketplace core. |
| **Risk & Compliance** | Sybil account detection, payment anomaly monitoring, withdrawal velocity limits, audit trails. | Silent unlogged account freezing. |

---

## 2. Infrastructure & Deployment Topology

```
                                      Internet
                                         │
                                         ▼
                              ┌─────────────────────┐
                              │     Cloudflare      │ (WAF, DDoS Shield, Edge SSL)
                              └──────────┬──────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
        ┌───────────────────────┐                 ┌───────────────────────┐
        │  Web Application      │                 │  API Application      │
        │  (Next.js App Router) │                 │  (REST v1 / Backend)  │
        └───────────────────────┘                 └───────────┬───────────┘
                                                              │
                    ┌─────────────────────────────────────────┼────────────────────────┐
                    ▼                                         ▼                        ▼
        ┌───────────────────────┐                 ┌───────────────────────┐┌───────────────────────┐
        │ Managed PostgreSQL 16 │                 │ Background Workers    ││ Private Object Store  │
        │ - Transactional State │                 │ - Outbox processor    ││ - Deliverables        │
        │ - Double-Entry Ledger │                 │ - Chain reconciler    ││ - Dispute Evidence    │
        └───────────────────────┘                 └───────────┬───────────┘│ (S3 with signed URLs) │
                                                              │            └───────────────────────┘
                                                              ▼
                                                  ┌───────────────────────┐
                                                  │ Chain RPC Gateway     │
                                                  │ - TCC Testnet Node    │
                                                  │ - Crown Edge (Rust)   │
                                                  └───────────────────────┘
```

### Component Deployment Breakdown
- **Web App Tier:** Deployed on Vercel or isolated containerized Node.js runtime. Handles server-side rendering and client-side form orchestration.
- **API Runtime:** Dedicated API process handling stateless JWT authentication, domain operations, and database transactions.
- **Worker Process:** Decoupled background service processing the transactional outbox queue, managing retry schedules, polling chain finality, and emitting notifications.
- **Database:** PostgreSQL (with automated point-in-time recovery, connection pooling via PgBouncer, and strict row-level locking).
- **Private Object Storage:** S3-compatible bucket with bucket policies strictly blocking public access. All uploads and downloads occur through 15-minute expiring signed URLs.
- **Blockchain Gateway:** Dedicated node or reliable JSON-RPC endpoint. Failovers configured to prevent stale-state readings.

---

## 3. Operational Reliability Targets

These quantitative targets govern the production environment:

| Target Domain | Metric | Engineering Standard |
| :--- | :--- | :--- |
| **System Availability** | Monthly API Uptime | **≥ 99.5%** (excluding scheduled maintenance) |
| **API Latency** | P95 Response Time | **< 500 ms** (for all non-blockchain internal operations) |
| **Ledger Integrity** | Double-Entry Balancing | **100.0%** (zero unexplained imbalances permitted) |
| **Payment Invariance** | Duplicate Settlement Rate | **0.00%** (guaranteed via unique idempotency keys & locks) |
| **Reconciliation** | Unreconciled Chain TXs | **0 unresolved** after 24 hours without operational alert |
| **Disaster Recovery** | RPO / RTO | **RPO < 15 minutes, RTO < 2 hours** (tested recovery runbook) |
| **Security Audit** | Vulnerability Threshold | **Zero Critical/High OWASP vulnerabilities** prior to launch |

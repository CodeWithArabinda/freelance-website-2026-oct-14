# 08 — Phased Roadmap, Release Gates & Decision Matrix

## 1. Phased Development Roadmap

The platform must be constructed in strict dependency order:

```
┌────────────────────────────────────────────────────────┐
│ Phase 01 — Foundation & Architecture Baseline          │
│ - Domain model, database schema, JWT auth, Vitest CI   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ Phase 02 — Marketplace Core Workflows                  │
│ - Jobs, proposals, contracts, milestones, private files│
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ Phase 03 — Double-Entry Ledger & Simulated Escrow      │
│ - Balanced journals, FSM transitions, idempotency keys │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ Phase 04 — TCC Prototype / Testnet Chain Adapter       │
│ - RPC integration, transaction verification, explorer  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ Phase 05 — Dispute Arbitration & Administration        │
│ - Evidence hashes, resolution verdicts, fraud controls │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ Phase 06 — CrownPay Wallet & Crown Edge Adapter        │
│ - Rust chain adapter, native CROWN (Grains), finality  │
└────────────────────────────────────────────────────────┘
```

---

## 2. The 7 Production Release Gates

Do not advance to live value transfers simply because the web user interface operates smoothly. All seven gates must pass with documented evidence:

1. **Authorization Verification:** All role-based and resource-level authorization boundaries pass automated regression tests with zero privilege escalation vulnerabilities.
2. **Ledger Balance Integrity:** 100% of posted double-entry journal entries balance. Concurrent settlement attempts are proven incapable of duplicate release.
3. **Recovery Resilience:** Payment intents recover gracefully from network timeouts, duplicate chain events, and worker crash restarts without fund loss.
4. **Independent Custody Verification:** The target custody model (platform control or on-chain escrow) has undergone independent security audit and verification.
5. **Operational Arbitration:** Dispute workflows, evidence preservation, refund mechanisms, and emergency freeze controls are validated end-to-end.
6. **Infrastructure Monitoring:** Automated continuous reconciliation, RPO/RTO backup restoration tests, and real-time anomaly alerts are active.
7. **Legal & Regulatory Compliance:** Required legal entity structuring, custody compliance, terms of service, and user protection agreements are formally established.

---

## 3. Product Decisions to Lock (ADR Matrix)

| Decision Question | Selected Architectural Option | Rationale & Execution Plan |
| :--- | :--- | :--- |
| **1. What controls escrow?** | **Model A (Platform-Managed) initially; Model B (On-Chain) on Crown Edge** | Avoids blocking marketplace launch on unfinished smart contract features. Clear sandbox labeling prevents user deception. |
| **2. What asset is supported at launch?** | **TCC Testnet Only** | Validates the full job-to-payment pipeline safely. CROWN (Crown Edge) introduced once the Rust node reaches mainnet stability. |
| **3. How does the platform charge fees?** | **Percentage Fee upon Milestone Settlement (e.g. 10%)** | Clean financial accounting. Accrued as a separate credit entry to `PLATFORM_FEE_PAYABLE` at the exact moment of client release. |
| **4. Who approves milestone release?** | **Client Approval with Admin Arbitration for Disputes** | Standard high-trust marketplace model. Unresponsive clients handled via documented inactivity timeout policies. |
| **5. How does CrownPay operate initially?** | **Cryptographic Challenge & External Signing Handshake** | Preserves a strict security boundary: keys never touch server memory; transactions are signed in the user's wallet. |

---

## 4. Key Architectural Principle

> **The marketplace manages agreements,  
> the escrow mechanism enforces funding and release rules,  
> the ledger accounts for every obligation,  
> and the blockchain adapter verifies what actually happened on-chain.**

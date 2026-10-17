# 03 — Escrow Mechanism & Double-Entry Ledger Core

## 1. Escrow Custody Models

Escrow is the highest-risk subsystem of the marketplace. An internal database record set to `FUNDED` is not proof that money exists or is safely locked. The platform distinguishes between two custody architectures:

### Model A — Platform-Managed Accounting (MVP & Prototype Baseline)
- **Mechanism:** The marketplace records liabilities in its internal double-entry ledger while a dedicated platform asset control account holds the custody balance.
- **Suitability:** Operationally straightforward, zero on-chain smart contract complexity, perfectly suited for the TCC Python testnet and initial launch.
- **Limitation:** Relies on platform integrity. The system must clearly label balances as platform-managed test custody rather than claiming trustless on-chain smart contract escrow.

### Model B — Protocol-Enforced On-Chain Escrow (Target Crown Edge Architecture)
- **Mechanism:** Assets are locked in an on-chain smart contract, script, or protocol multisig account that enforces cryptographic release and refund conditions.
- **Suitability:** Production deployment on Crown Edge once native Rust escrow opcodes/contracts are implemented, formally audited, and verified.
- **Requirement:** An ordinary transfer API is insufficient. The chain must natively support conditional locking, time-locks, and multisig/arbitration authorization.

---

## 2. Double-Entry Accounting Architecture

The platform's financial source of truth is an immutable double-entry ledger. Balances are never updated through arbitrary arithmetic; they are strictly calculated as the sum of posted debit and credit entries.

### Chart of Accounts

| Account Type | Classification | Normal Balance | Purpose |
| :--- | :--- | :--- | :--- |
| `ESCROW_ASSET_HOLDING` | Asset (Control) | Debit | Represents total physical/custodial assets held under platform control. |
| `CLIENT_ESCROW_LIABILITY` | Liability | Credit | Represents obligations owed back to clients for unreleased funded milestones. |
| `FREELANCER_PAYABLE` | Liability | Credit | Represents earned settlement owed to freelancers awaiting payout transfer. |
| `PLATFORM_FEE_PAYABLE` | Equity / Revenue | Credit | Represents accrued platform commission on completed milestones. |
| `CLIENT_AVAILABLE_BALANCE` | Liability | Credit | Represents deposited client funds available for milestone allocation. |

---

## 3. Double-Entry Journal Examples

Consider a client funding a milestone of **1,000 atomic units** with an illustrative **10% platform fee** (100 units):

### Event 1: Milestone Funding Confirmed (1,000 units)
When the chain adapter verifies that the client's funding transaction has achieved required block finality:

| Journal Account | Debit Amount | Credit Amount | Note |
| :--- | :--- | :--- | :--- |
| `ESCROW_ASSET_HOLDING` | 1,000 | — | Assets under platform escrow control increase |
| `CLIENT_ESCROW_LIABILITY` | — | 1,000 | Platform liability to client established |

### Event 2: Milestone Approval & Settlement (1,000 units)
When the client inspects deliverables and approves milestone release:

| Journal Account | Debit Amount | Credit Amount | Note |
| :--- | :--- | :--- | :--- |
| `CLIENT_ESCROW_LIABILITY` | 1,000 | — | Client escrow liability discharged |
| `FREELANCER_PAYABLE` | — | 900 | 90% net earned balance owed to freelancer |
| `PLATFORM_FEE_PAYABLE` | — | 100 | 10% marketplace revenue recognized |

### Event 3: Freelancer Payout Executed (900 units)
When on-chain payout transaction transfers net funds to freelancer's external wallet:

| Journal Account | Debit Amount | Credit Amount | Note |
| :--- | :--- | :--- | :--- |
| `FREELANCER_PAYABLE` | 900 | — | Payout liability discharged |
| `ESCROW_ASSET_HOLDING` | — | 900 | Custodial asset balance reduced |

### Event 4: Dispute Refund to Client (1,000 units)
If an administrator rules in favor of a full client refund following arbitration:

| Journal Account | Debit Amount | Credit Amount | Note |
| :--- | :--- | :--- | :--- |
| `CLIENT_ESCROW_LIABILITY` | 1,000 | — | Escrow liability cancelled |
| `CLIENT_AVAILABLE_BALANCE` | — | 1,000 | Credited back to client's available balance |

---

## 4. Fundamental Financial Invariants

1. **Integer Atomic Units:** No floating-point math (`0.1 + 0.2 = 0.30000000000000004`). Every quantity is an integer minor unit (e.g., Grains on Crown Edge where $1\text{ CROWN} = 10^9\text{ Grains}$).
2. **Strict Journal Balance:** Every posted journal must satisfy:
   $$\sum \text{Debits} \equiv \sum \text{Credits}$$
3. **Immutable History:** Journal entries are append-only. Corrections require compensating journal entries with documented audit references; records are never deleted or silently overwritten.
4. **Idempotent Operations:** Every financial command requires a unique client-generated or domain-derived `idempotency_key`. Repeating a request returns the existing journal without duplicating ledger effects.
5. **Reconciliation Invariant:** Continuous background workers verify that:
   $$\text{Ledger Balance}(\text{ESCROW\_ASSET\_HOLDING}) \equiv \text{Custody Balance on Chain / Wallet}$$
   Any deviation immediately trips a high-priority operational alarm and freezes automated releases.

---

## 5. Dispute Resolution & Evidence Integrity

- **Automatic Suspension:** The moment a dispute is opened by either party, normal release workflows for that milestone are immediately frozen.
- **Evidence Immutability:** Statements, repository snapshots, delivery logs, and timestamps submitted during dispute review are cryptographically hashed and cannot be altered or removed by either party.
- **Milestone Isolation:** A dispute on Milestone $N$ does not block previously completed or subsequent independent milestones unless contract terms explicitly declare a cross-milestone dependency.
- **Administrator Authority Boundary:** Administrative verdicts (full release, partial split, or full refund) execute standard ledger journals. Administrators cannot magically revert an on-chain transaction that has already settled.

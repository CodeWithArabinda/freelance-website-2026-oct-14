# 05 — Database Design & Relational Data Integrity

## 1. Relational Entity Dictionary (19 Essential Tables)

The PostgreSQL transactional database is authoritative for marketplace agreements, contracts, delivery proofs, ledger journals, and workflow states.

### Identity & Profiles
1. **`users`**: Unique account identity (`id`, `email`, `password_hash`, `account_status`, `created_at`, `updated_at`).
2. **`user_roles`**: Granular role assignments (`id`, `user_id`, `role` [CLIENT, FREELANCER, ADMIN], `grant_metadata`, `created_at`).
3. **`freelancer_profiles`**: Public profile (`id`, `user_id`, `headline`, `bio`, `hourly_rate_minor`, `skills`, `verification_status`).
4. **`wallet_connections`**: Authenticated Web3/CrownPay addresses (`id`, `user_id`, `network_id`, `public_address`, `verified_at`, `nonce`).

### Marketplace Core
5. **`jobs`**: Client project listings (`id`, `client_id`, `title`, `description`, `category`, `budget_minor`, `asset_id`, `status`, `deadline`).
6. **`proposals`**: Freelancer offers (`id`, `job_id`, `freelancer_id`, `bid_amount_minor`, `estimated_days`, `cover_letter`, `status`).
7. **`contracts`**: Legally binding accepted engagements (`id`, `job_id`, `client_id`, `freelancer_id`, `terms_hash`, `version`, `status`).
8. **`milestones`**: Sequenced deliverables within a contract (`id`, `contract_id`, `sequence`, `title`, `amount_minor`, `asset_id`, `due_date`, `status`).
9. **`deliverables`**: Work submission records (`id`, `milestone_id`, `contract_id`, `freelancer_id`, `object_key`, `content_hash`, `notes`, `submitted_at`).
10. **`reviews`**: Bilateral post-completion feedback (`id`, `contract_id`, `author_id`, `recipient_id`, `rating`, `feedback`, `created_at`).

### Payments, Escrow & Blockchain
11. **`payment_intents`**: Track funding/payout intents (`id`, `milestone_id`, `asset_id`, `network_id`, `amount_atomic`, `idempotency_key`, `status`).
12. **`escrow_positions`**: Custody tracking per milestone (`id`, `milestone_id`, `asset_id`, `locked_amount_atomic`, `provider_ref`, `status`).
13. **`chain_transactions`**: Observed on-chain transfers (`id`, `network_id`, `tx_hash`, `from_address`, `to_address`, `amount_atomic`, `status`, `confirmations`).

### Double-Entry Accounting
14. **`ledger_accounts`**: Chart of accounts (`id`, `user_id`, `account_type`, `asset_id`, `balance_minor`, `updated_at`).
15. **`ledger_transactions`**: Transaction journal metadata (`id`, `business_reference`, `idempotency_key`, `description`, `posted_at`).
16. **`ledger_entries`**: Immutable debit/credit line items (`id`, `transaction_id`, `account_id`, `entry_type` [DEBIT/CREDIT], `amount_atomic`).

### Operations & Reliability
17. **`disputes`**: Formal arbitration cases (`id`, `contract_id`, `milestone_id`, `initiator_id`, `reason`, `status`, `resolution_notes`, `resolved_by`).
18. **`outbox_events`**: Transactional outbox for event publishing (`id`, `aggregate_type`, `aggregate_id`, `payload`, `status`, `retry_count`, `created_at`).
19. **`audit_events`**: Append-only compliance log (`id`, `actor_id`, `action`, `entity_type`, `entity_id`, `payload`, `ip_address`, `created_at`).

---

## 2. The 8 Critical Data Integrity Constraints

Every engineer, service, and database migration must enforce these 8 non-negotiable invariants:

1. **Anti-Impersonation:** A freelancer cannot submit a proposal, deliver work, or file a dispute on behalf of another user account.
2. **Contract Scoping:** A client cannot fund, approve, or dispute a milestone belonging to an unrelated contract.
3. **Participant Access:** Only the explicit client or freelancer bound to a contract (or an authorized administrator) can access private contract details and deliverables.
4. **Idempotent Settlement (No Double Release):** A milestone cannot be released twice. Unique database constraints prevent multiple `COMPLETED` settlements for the same milestone ID.
5. **No Duplicate Journals:** A ledger transaction journal cannot be posted twice for the same business operation (`UNIQUE(business_reference, idempotency_key)`).
6. **Cross-Network Isolation:** A transaction observed on one network (e.g. `TCC_TESTNET`) can NEVER satisfy a payment intent created for another (e.g. `CROWN_MAINNET`).
7. **Immutable Funded Terms:** Once a milestone achieves `FUNDED` status, the milestone amount, asset ID, and scope cannot be mutated without a separately executed, mutually approved contract amendment.
8. **Audit Trail for Financial Adjustments:** No administrative override, dispute release, or refund can occur without an immutable audit event referencing the authorizing actor ID and written justification.

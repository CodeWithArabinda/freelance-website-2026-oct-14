# 04 — Blockchain Integration & Chain Adapter Layer

## 1. Boundary Separation: The Four Concepts

To avoid catastrophic coupling, four distinct entities must never be conflated:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. TCC Freelance (Business Application)                                │
│ - Owns: Jobs, proposals, contracts, milestone logic, ledger, disputes   │
│ - Tech: Next.js, TypeScript, PostgreSQL, Prisma, Vitest               │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 2. CrownPay (Client & Freelancer Wallet)                               │
│ - Owns: Key management, wallet connection, UI signing prompts          │
│ - Rule: Untrusted boundary. Never trusted for finality verification.   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 3. Chain Adapter Boundary (Interface Layer)                            │
│ - Defines: ChainAdapter & EscrowProvider abstractions                  │
└──────────────────┬──────────────────────────────────┬──────────────────┘
                   │                                  │
                   ▼                                  ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│ 4A. TCC Prototype (Initial Testnet)  │  │ 4B. Crown Edge (Future Prod) │
│ - Tech: Python prototype/testnet     │  │ - Tech: Rust sovereign chain │
│ - Asset: TCC (Test Crown Coins)      │  │ - Asset: CROWN (10^9 Grains) │
│ - Status: Development & Sandbox Only │  │ - Status: Production Target  │
└──────────────────────────────────────┘  └──────────────────────────────┘
```

---

## 2. Interface Contracts

The application interacts with blockchain networks exclusively through abstract TypeScript interfaces:

```typescript
export type AssetId = string;       // e.g., "TCC_TESTNET" | "CROWN_MAINNET"
export type AtomicAmount = string;  // Positive integer string to prevent overflow

export interface PaymentIntent {
  id: string;
  milestoneId: string;
  contractId: string;
  assetId: AssetId;
  networkId: string;
  amountAtomic: AtomicAmount;
  payerAddress?: string;
  payeeAddress: string;
  idempotencyKey: string;
  status: "CREATED" | "PENDING" | "CONFIRMED" | "FAILED" | "EXPIRED";
  expiresAt: Date;
}

export interface ChainTransaction {
  networkId: string;
  transactionHash: string;
  blockNumber?: number;
  fromAddress: string;
  toAddress: string;
  amountAtomic: AtomicAmount;
  assetId: AssetId;
  status: "PENDING" | "CONFIRMED" | "FINALIZED" | "FAILED";
  confirmations: number;
  timestamp: Date;
}

export interface ChainAdapter {
  getNetworkId(): Promise<string>;
  getTransaction(txHash: string): Promise<ChainTransaction | null>;
  verifyIncomingPayment(intent: PaymentIntent, txHash: string): Promise<ChainTransaction>;
  submitSettlement(commandId: string, recipient: string, amount: AtomicAmount): Promise<ChainTransaction>;
  estimateNetworkFee(assetId: AssetId): Promise<AtomicAmount>;
}

export interface EscrowProvider {
  createEscrowLock(intent: PaymentIntent): Promise<{ escrowRecordId: string; lockTxHash?: string }>;
  releaseEscrow(commandId: string, escrowRecordId: string): Promise<{ releaseTxHash?: string }>;
  refundEscrow(commandId: string, escrowRecordId: string): Promise<{ refundTxHash?: string }>;
  getEscrowStatus(escrowRecordId: string): Promise<"HOLDING" | "RELEASED" | "REFUNDED">;
}
```

---

## 3. Asset & Network Policy

| Policy Domain | Invariant Rule |
| :--- | :--- |
| **Asset Identity** | Assets must use canonical identifiers: `network_id + asset_id` (e.g. `tcc:testnet:tcc` vs `crown:mainnet:crown`). |
| **TCC Asset Status** | **Testnet-only currency.** All UI screens and ledger balances must prominently display "Test Sandbox Funds" to avoid any real-money misrepresentation. |
| **Crown Edge Native Units** | 1 CROWN = $10^9$ Grains. Maximum supply capped at $10^{13}$ CROWN. Quantities in databases and APIs are stored as integer Grains or high-precision numeric strings. |
| **CrownPay Handshake** | CrownPay connects via an explicit EIP-4361 / SIWE-style cryptographic challenge (`POST /api/v1/wallet-connections/challenge` & `/verify`). Sessions are bound to verified public keys. |
| **Fee Demarcation** | Network gas fees, marketplace commissions (e.g. 10%), and custody charges are tracked separately in distinct ledger accounts. Never deduct fees without a distinct journal entry. |
| **No Implicit Conversion** | Zero automatic bridging or exchange rates between TCC and CROWN. They are distinct assets on separate networks. |
| **Finality Policies** | A transaction is considered `CONFIRMED` only after reaching chain-specific finality thresholds (e.g., $N$ block confirmations on PoW/PoS or BFT finality on Crown Edge). |
| **Transaction Explorer** | Every on-chain settlement links directly to the verified block explorer for that network. |

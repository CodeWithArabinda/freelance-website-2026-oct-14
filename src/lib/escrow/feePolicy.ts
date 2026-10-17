/**
 * Settlement Fee Policy for TCC Freelance
 * 
 * Enforces exact integer arithmetic using basis points.
 * 1 basis point = 0.01%
 * 1,000 basis points = 10.00%
 */

export const STANDARD_FEE_BPS = BigInt(1000); // 10.00%
export const FEE_BPS_DENOMINATOR = BigInt(10000);

export interface SettlementBreakdown {
  grossAmountMinor: number;
  feeMinor: number;
  netFreelancerMinor: number;
  feeBps: number;
}

/**
 * Calculates exact integer settlement distribution between platform fee and freelancer net payout.
 * 
 * Invariants:
 * - amountAtomic must be strictly positive (> 0)
 * - feeBps must be in range [0, 10000]
 * - feeAtomic = floor((amountAtomic * feeBps) / 10000)
 * - freelancerAtomic = amountAtomic - feeAtomic
 * - feeAtomic + freelancerAtomic === amountAtomic (exact balance conservation)
 */
export function calculateSettlement(
  amountAtomic: number | bigint,
  feeBps: number | bigint = STANDARD_FEE_BPS
): SettlementBreakdown {
  const amount = BigInt(amountAtomic);
  const bps = BigInt(feeBps);

  if (amount <= BigInt(0)) {
    throw new Error("INVALID_AMOUNT: Settlement amount must be strictly greater than zero");
  }

  if (bps < BigInt(0) || bps > FEE_BPS_DENOMINATOR) {
    throw new Error("INVALID_FEE_BPS: Fee basis points must be between 0 and 10000 (0% to 100%)");
  }

  // Exact integer arithmetic (floor division)
  const feeAtomic = (amount * bps) / FEE_BPS_DENOMINATOR;
  const freelancerAtomic = amount - feeAtomic;

  return {
    grossAmountMinor: Number(amount),
    feeMinor: Number(feeAtomic),
    netFreelancerMinor: Number(freelancerAtomic),
    feeBps: Number(bps),
  };
}

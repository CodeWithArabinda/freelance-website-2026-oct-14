import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/db";
import { calculateSettlement, STANDARD_FEE_BPS, FEE_BPS_DENOMINATOR } from "../src/lib/escrow/feePolicy";
import {
  fundContractEscrow,
  submitContractWork,
  approveAndReleaseSimulated,
  fileContractDispute,
  resolveContractDisputeSimulated,
} from "../src/lib/escrow/escrowService";
import bcrypt from "bcryptjs";

describe("Settlement Fee Policy Unit Tests (Pure Calculations & Bounds)", () => {
  it("calculates exact 10% fee on 1,000 units ($10.00)", () => {
    const res = calculateSettlement(1000, 1000);
    expect(res.grossAmountMinor).toBe(1000);
    expect(res.feeMinor).toBe(100);
    expect(res.netFreelancerMinor).toBe(900);
    expect(res.feeBps).toBe(1000);
    expect(res.feeMinor + res.netFreelancerMinor).toBe(res.grossAmountMinor);
  });

  it("calculates exact 10% fee on $1,000.00 (100,000 minor units)", () => {
    const res = calculateSettlement(100000, 1000);
    expect(res.grossAmountMinor).toBe(100000);
    expect(res.feeMinor).toBe(10000);
    expect(res.netFreelancerMinor).toBe(90000);
    expect(res.feeMinor + res.netFreelancerMinor).toBe(res.grossAmountMinor);
  });

  it("handles small amounts with floor truncation correctly", () => {
    // 5 cents with 10% fee: floor(5 * 1000 / 10000) = floor(0.5) = 0 fee, 5 net
    const res5 = calculateSettlement(5, 1000);
    expect(res5.feeMinor).toBe(0);
    expect(res5.netFreelancerMinor).toBe(5);
    expect(res5.feeMinor + res5.netFreelancerMinor).toBe(5);

    // 9 cents with 10% fee: floor(9 * 1000 / 10000) = floor(0.9) = 0 fee, 9 net
    const res9 = calculateSettlement(9, 1000);
    expect(res9.feeMinor).toBe(0);
    expect(res9.netFreelancerMinor).toBe(9);
    expect(res9.feeMinor + res9.netFreelancerMinor).toBe(9);

    // 10 cents with 10% fee: floor(10 * 1000 / 10000) = floor(1) = 1 fee, 9 net
    const res10 = calculateSettlement(10, 1000);
    expect(res10.feeMinor).toBe(1);
    expect(res10.netFreelancerMinor).toBe(9);
    expect(res10.feeMinor + res10.netFreelancerMinor).toBe(10);

    // 99 cents with 10% fee: floor(99 * 1000 / 10000) = floor(9.9) = 9 fee, 90 net
    const res99 = calculateSettlement(99, 1000);
    expect(res99.feeMinor).toBe(9);
    expect(res99.netFreelancerMinor).toBe(90);
    expect(res99.feeMinor + res99.netFreelancerMinor).toBe(99);

    // 1 cent with 10% fee: floor(1 * 1000 / 10000) = 0 fee, 1 net
    const res1 = calculateSettlement(1, 1000);
    expect(res1.feeMinor).toBe(0);
    expect(res1.netFreelancerMinor).toBe(1);
    expect(res1.feeMinor + res1.netFreelancerMinor).toBe(1);
  });

  it("handles extreme fee basis point boundaries [0, 10000]", () => {
    // 0% fee (0 bps)
    const zeroFee = calculateSettlement(50000, 0);
    expect(zeroFee.feeMinor).toBe(0);
    expect(zeroFee.netFreelancerMinor).toBe(50000);

    // 100% fee (10000 bps)
    const fullFee = calculateSettlement(50000, 10000);
    expect(fullFee.feeMinor).toBe(50000);
    expect(fullFee.netFreelancerMinor).toBe(0);

    // Custom 5% fee (500 bps)
    const fivePercent = calculateSettlement(100000, 500);
    expect(fivePercent.feeMinor).toBe(5000);
    expect(fivePercent.netFreelancerMinor).toBe(95000);
  });

  it("handles very large amounts safely using BigInt arithmetic", () => {
    // $100,000,000.00 = 10,000,000,000 minor units
    const largeAmount = BigInt("10000000000");
    const res = calculateSettlement(largeAmount, BigInt(1000));
    expect(res.grossAmountMinor).toBe(10_000_000_000);
    expect(res.feeMinor).toBe(1_000_000_000); // 10% = $10,000,000.00
    expect(res.netFreelancerMinor).toBe(9_000_000_000); // 90% = $90,000,000.00
    expect(res.feeMinor + res.netFreelancerMinor).toBe(res.grossAmountMinor);
  });

  it("rejects invalid fee rates (< 0 or > 10000)", () => {
    expect(() => calculateSettlement(1000, -1)).toThrow(/INVALID_FEE_BPS/i);
    expect(() => calculateSettlement(1000, -500)).toThrow(/INVALID_FEE_BPS/i);
    expect(() => calculateSettlement(1000, 10001)).toThrow(/INVALID_FEE_BPS/i);
    expect(() => calculateSettlement(1000, 20000)).toThrow(/INVALID_FEE_BPS/i);
  });

  it("rejects zero and negative settlement amounts", () => {
    expect(() => calculateSettlement(0, 1000)).toThrow(/INVALID_AMOUNT/i);
    expect(() => calculateSettlement(-100, 1000)).toThrow(/INVALID_AMOUNT/i);
    expect(() => calculateSettlement(-1, 1000)).toThrow(/INVALID_AMOUNT/i);
  });

  it("defaults to STANDARD_FEE_BPS (1000) when feeBps is omitted", () => {
    const res = calculateSettlement(20000);
    expect(res.feeBps).toBe(1000);
    expect(res.feeMinor).toBe(2000);
    expect(res.netFreelancerMinor).toBe(18000);
  });
});

describe("Settlement Fee Accounting Integration & Ledger Invariants", () => {
  let clientUser: any;
  let freelancerUser: any;
  let adminUser: any;
  let job: any;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash("Pass1234!", 10);

    clientUser = await prisma.user.create({
      data: {
        email: `feetest_client_${Date.now()}@tcc.test`,
        passwordHash,
        fullName: "Fee Test Client",
        role: "CLIENT",
        clientProfile: {
          create: {
            companyName: "Fee Verification Corp",
            totalSpentMinor: 0,
          },
        },
        ledgerAccounts: {
          create: {
            accountType: "CLIENT_AVAILABLE",
            balanceMinor: 2000000, // $20,000.00
          },
        },
      },
      include: { clientProfile: true },
    });

    freelancerUser = await prisma.user.create({
      data: {
        email: `feetest_free_${Date.now()}@tcc.test`,
        passwordHash,
        fullName: "Fee Test Freelancer",
        role: "FREELANCER",
        freelancerProfile: {
          create: {
            skills: JSON.stringify(["Full-Stack"]),
            totalEarnedMinor: 0,
          },
        },
        ledgerAccounts: {
          create: {
            accountType: "FREELANCER_AVAILABLE",
            balanceMinor: 0,
          },
        },
      },
      include: { freelancerProfile: true },
    });

    adminUser = await prisma.user.create({
      data: {
        email: `feetest_admin_${Date.now()}@tcc.test`,
        passwordHash,
        fullName: "Fee Test Admin",
        role: "ADMIN",
      },
    });

    job = await prisma.job.create({
      data: {
        clientId: clientUser.id,
        title: "Fee Accounting Test Job",
        description: "Validating fee ledger entries and double entry invariants",
        category: "Fintech",
        budgetMinor: 500000,
        skillsRequired: JSON.stringify(["Fintech"]),
      },
    });
  });

  afterAll(async () => {
    // Clean up created records
    const contracts = await prisma.contract.findMany({ where: { clientId: clientUser.id } });
    const contractIds = contracts.map((c) => c.id);

    await prisma.ledgerEntry.deleteMany({ where: { contractId: { in: contractIds } } });
    await prisma.escrowRecord.deleteMany({ where: { contractId: { in: contractIds } } });
    await prisma.workSubmission.deleteMany({ where: { contractId: { in: contractIds } } });
    await prisma.dispute.deleteMany({ where: { contractId: { in: contractIds } } });
    await prisma.milestone.deleteMany({ where: { contractId: { in: contractIds } } });
    await prisma.contract.deleteMany({ where: { id: { in: contractIds } } });
    await prisma.job.deleteMany({ where: { id: job.id } });
    await prisma.freelancerProfile.deleteMany({ where: { userId: freelancerUser.id } });
    await prisma.clientProfile.deleteMany({ where: { userId: clientUser.id } });
    await prisma.ledgerAccount.deleteMany({
      where: { userId: { in: [clientUser.id, freelancerUser.id, adminUser.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [clientUser.id, freelancerUser.id, adminUser.id] } },
    });
  });

  it("settles standard 10% fee contract with balanced double-entry ledger entries", async () => {
    const grossAmount = 250000; // $2,500.00
    const contract = await prisma.contract.create({
      data: {
        jobId: job.id,
        clientId: clientUser.id,
        freelancerId: freelancerUser.id,
        title: "Standard 10% Fee Settlement Contract",
        totalAmountMinor: grossAmount,
        feeBps: 1000, // 10%
        status: "CREATED",
        milestones: {
          create: [
            {
              title: "Deliver milestone",
              description: "Deliver milestone deliverables",
              amountMinor: grossAmount,
              feeBps: 1000,
              orderIndex: 0,
              status: "PENDING",
            },
          ],
        },
      },
    });

    // 1. Fund escrow
    await fundContractEscrow(contract.id, clientUser.id);

    // 2. Freelancer submits work
    await submitContractWork(contract.id, freelancerUser.id, "Submission for fee testing");

    // Check pre-release balances
    const holdingBefore = await prisma.ledgerAccount.findFirst({
      where: { userId: null, accountType: "PLATFORM_ESCROW_HOLDING" },
    });
    const platformFeeBefore = await prisma.ledgerAccount.findFirst({
      where: { userId: null, accountType: "PLATFORM_FEE_REVENUE" },
    });
    const feeBalanceBefore = platformFeeBefore?.balanceMinor ?? 0;

    // 3. Client approves and releases
    const releasedContract = await approveAndReleaseSimulated(contract.id, clientUser.id);
    expect(releasedContract.status).toBe("RELEASED_SIMULATED");

    // Expected 90/10 split
    const expectedFee = 25000; // 10% of 250,000
    const expectedNet = 225000; // 90% of 250,000

    // Check ledger entries for this contract
    const entries = await prisma.ledgerEntry.findMany({
      where: { contractId: contract.id },
    });

    // Verify ESCROW_RELEASE entry
    const releaseEntry = entries.find((e) => e.referenceType === "ESCROW_RELEASE");
    expect(releaseEntry).toBeDefined();
    expect(releaseEntry?.amountMinor).toBe(expectedNet);

    // Verify PLATFORM_FEE entry
    const feeEntry = entries.find((e) => e.referenceType === "PLATFORM_FEE");
    expect(feeEntry).toBeDefined();
    expect(feeEntry?.amountMinor).toBe(expectedFee);

    // Verify double-entry balancing:
    // ESCROW_RELEASE: debit platformHolding, credit freelancerAccount (amount: 225,000)
    // PLATFORM_FEE: debit platformHolding, credit platformFeeRevenue (amount: 25,000)
    // Total debited from platformHolding: 250,000. Total credited: 225,000 + 25,000 = 250,000.
    const settlementEntries = [releaseEntry!, feeEntry!];
    const totalDebits = settlementEntries.reduce((sum, e) => sum + e.amountMinor, 0);
    expect(totalDebits).toBe(grossAmount);

    // Verify platform fee account balance incremented exactly by fee
    const platformFeeAfter = await prisma.ledgerAccount.findFirst({
      where: { userId: null, accountType: "PLATFORM_FEE_REVENUE" },
    });
    expect(platformFeeAfter?.balanceMinor).toBe(feeBalanceBefore + expectedFee);

    // Verify freelancer balance credited by net amount
    const freelancerAccount = await prisma.ledgerAccount.findFirst({
      where: { userId: freelancerUser.id, accountType: "FREELANCER_AVAILABLE" },
    });
    expect(freelancerAccount?.balanceMinor).toBe(expectedNet);

    // Verify profile totals: freelancer earned net, client spent gross
    const updatedFreelancerProfile = await prisma.freelancerProfile.findUnique({
      where: { userId: freelancerUser.id },
    });
    expect(updatedFreelancerProfile?.totalEarnedMinor).toBe(expectedNet);

    const updatedClientProfile = await prisma.clientProfile.findUnique({
      where: { userId: clientUser.id },
    });
    expect(updatedClientProfile?.totalSpentMinor).toBe(grossAmount);
  });

  it("settles custom snapshotted fee (5% / 500 bps) cleanly", async () => {
    const grossAmount = 100000; // $1,000.00
    const customBps = 500; // 5.00%
    const contract = await prisma.contract.create({
      data: {
        jobId: job.id,
        clientId: clientUser.id,
        freelancerId: freelancerUser.id,
        title: "Custom 5% Fee Settlement Contract",
        totalAmountMinor: grossAmount,
        feeBps: customBps,
        status: "CREATED",
        milestones: {
          create: [
            {
              title: "Milestone at 5% fee",
              description: "Milestone deliverable for 5% fee test",
              amountMinor: grossAmount,
              feeBps: customBps,
              orderIndex: 0,
              status: "PENDING",
            },
          ],
        },
      },
    });

    await fundContractEscrow(contract.id, clientUser.id);
    await submitContractWork(contract.id, freelancerUser.id, "Delivered under 5% contract terms");

    const releaseOutcome = await approveAndReleaseSimulated(contract.id, clientUser.id);
    expect(releaseOutcome.status).toBe("RELEASED_SIMULATED");

    const releaseEntry = await prisma.ledgerEntry.findFirst({
      where: { contractId: contract.id, referenceType: "ESCROW_RELEASE" },
    });
    const feeEntry = await prisma.ledgerEntry.findFirst({
      where: { contractId: contract.id, referenceType: "PLATFORM_FEE" },
    });

    expect(releaseEntry?.amountMinor).toBe(95000); // 95%
    expect(feeEntry?.amountMinor).toBe(5000); // 5%
    expect(releaseEntry!.amountMinor + feeEntry!.amountMinor).toBe(grossAmount);
  });

  it("handles zero-fee contract (0 bps) with 100% to freelancer and 0 fee entry", async () => {
    const grossAmount = 50000; // $500.00
    const contract = await prisma.contract.create({
      data: {
        jobId: job.id,
        clientId: clientUser.id,
        freelancerId: freelancerUser.id,
        title: "Zero Fee Promotional Contract",
        totalAmountMinor: grossAmount,
        feeBps: 0, // 0%
        status: "CREATED",
        milestones: {
          create: [
            {
              title: "Zero fee milestone",
              description: "Zero fee promotional milestone",
              amountMinor: grossAmount,
              feeBps: 0,
              orderIndex: 0,
              status: "PENDING",
            },
          ],
        },
      },
    });

    await fundContractEscrow(contract.id, clientUser.id);
    await submitContractWork(contract.id, freelancerUser.id, "Promotional deliverable");
    await approveAndReleaseSimulated(contract.id, clientUser.id);

    const releaseEntry = await prisma.ledgerEntry.findFirst({
      where: { contractId: contract.id, referenceType: "ESCROW_RELEASE" },
    });
    const feeEntry = await prisma.ledgerEntry.findFirst({
      where: { contractId: contract.id, referenceType: "PLATFORM_FEE" },
    });

    expect(releaseEntry?.amountMinor).toBe(grossAmount);
    expect(feeEntry).toBeNull(); // No platform fee entry created when fee is 0
  });

  it("applies fee policy in dispute resolution when resolved in favor of freelancer", async () => {
    const grossAmount = 80000; // $800.00
    const contract = await prisma.contract.create({
      data: {
        jobId: job.id,
        clientId: clientUser.id,
        freelancerId: freelancerUser.id,
        title: "Dispute Resolved for Freelancer",
        totalAmountMinor: grossAmount,
        feeBps: 1000,
        status: "CREATED",
        milestones: {
          create: [
            {
              title: "Disputed deliverable",
              description: "Disputed milestone deliverable",
              amountMinor: grossAmount,
              feeBps: 1000,
              orderIndex: 0,
              status: "PENDING",
            },
          ],
        },
      },
    });

    await fundContractEscrow(contract.id, clientUser.id);
    const { dispute } = await fileContractDispute(contract.id, clientUser.id, "Disagreement on timeline");

    const resolved = await resolveContractDisputeSimulated(
      dispute.id,
      adminUser.id,
      "RELEASE_TO_FREELANCER",
      "Freelancer proved work met all specification criteria"
    );

    expect(resolved.status).toBe("RESOLVED_RELEASE");

    const releaseEntry = await prisma.ledgerEntry.findFirst({
      where: { contractId: contract.id, referenceType: "ESCROW_RELEASE" },
    });
    const feeEntry = await prisma.ledgerEntry.findFirst({
      where: { contractId: contract.id, referenceType: "PLATFORM_FEE" },
    });

    expect(releaseEntry?.amountMinor).toBe(72000); // 90% of 80,000
    expect(feeEntry?.amountMinor).toBe(8000); // 10% of 80,000
    expect(releaseEntry!.amountMinor + feeEntry!.amountMinor).toBe(grossAmount);
  });

  it("charges ZERO fee and refunds 100% principal when dispute is resolved with REFUND_TO_CLIENT", async () => {
    const grossAmount = 70000; // $700.00
    const contract = await prisma.contract.create({
      data: {
        jobId: job.id,
        clientId: clientUser.id,
        freelancerId: freelancerUser.id,
        title: "Dispute Refund Contract",
        totalAmountMinor: grossAmount,
        feeBps: 1000,
        status: "CREATED",
        milestones: {
          create: [
            {
              title: "Refund milestone",
              description: "Milestone for refund test",
              amountMinor: grossAmount,
              feeBps: 1000,
              orderIndex: 0,
              status: "PENDING",
            },
          ],
        },
      },
    });

    await fundContractEscrow(contract.id, clientUser.id);
    const { dispute } = await fileContractDispute(contract.id, clientUser.id, "Work never started");

    const resolved = await resolveContractDisputeSimulated(
      dispute.id,
      adminUser.id,
      "REFUND_TO_CLIENT",
      "Client refunded in full"
    );

    expect(resolved.status).toBe("RESOLVED_REFUND");

    // Verify 100% principal was refunded
    const refundEntry = await prisma.ledgerEntry.findFirst({
      where: { contractId: contract.id, referenceType: "ESCROW_REFUND" },
    });
    expect(refundEntry?.amountMinor).toBe(grossAmount);

    // Verify ZERO fee entry was created
    const feeEntry = await prisma.ledgerEntry.findFirst({
      where: { contractId: contract.id, referenceType: "PLATFORM_FEE" },
    });
    expect(feeEntry).toBeNull();
  });

  it("rejects duplicate release and prevents double-crediting", async () => {
    const grossAmount = 30000;
    const contract = await prisma.contract.create({
      data: {
        jobId: job.id,
        clientId: clientUser.id,
        freelancerId: freelancerUser.id,
        title: "Duplicate Release Guard Contract",
        totalAmountMinor: grossAmount,
        feeBps: 1000,
        status: "CREATED",
        milestones: {
          create: [
            {
              title: "M1",
              description: "Milestone for duplicate test",
              amountMinor: grossAmount,
              feeBps: 1000,
              orderIndex: 0,
              status: "PENDING",
            },
          ],
        },
      },
    });

    await fundContractEscrow(contract.id, clientUser.id);
    await submitContractWork(contract.id, freelancerUser.id, "Submission");

    await approveAndReleaseSimulated(contract.id, clientUser.id);

    // Second release must fail
    await expect(
      approveAndReleaseSimulated(contract.id, clientUser.id)
    ).rejects.toThrow(/already been released/i);

    // Ensure only 1 ESCROW_RELEASE entry exists
    const releaseEntries = await prisma.ledgerEntry.findMany({
      where: { contractId: contract.id, referenceType: "ESCROW_RELEASE" },
    });
    expect(releaseEntries.length).toBe(1);
  });
});

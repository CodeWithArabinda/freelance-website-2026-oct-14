import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/db";
import { calculateSettlement } from "../src/lib/escrow/feePolicy";
import {
  fundContractEscrow,
  submitContractWork,
  approveAndReleaseSimulated,
  fileContractDispute,
  resolveContractDisputeSimulated,
} from "../src/lib/escrow/escrowService";
import { EscrowTransitionError } from "../src/lib/escrow/stateMachine";
import bcrypt from "bcryptjs";

describe("Senior Verification Audit — Settlement Fee Accounting & Concurrency", () => {
  let client1: any;
  let client2: any;
  let freelancer1: any;
  let freelancer2: any;
  let admin: any;
  let job1: any;
  let job2: any;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash("Pass1234!", 10);

    client1 = await prisma.user.create({
      data: {
        email: `audit_client1_${Date.now()}@tcc.test`,
        passwordHash,
        fullName: "Audit Client 1",
        role: "CLIENT",
        ledgerAccounts: {
          create: { accountType: "CLIENT_AVAILABLE", balanceMinor: 5000000 }, // $50,000
        },
      },
    });

    client2 = await prisma.user.create({
      data: {
        email: `audit_client2_${Date.now()}@tcc.test`,
        passwordHash,
        fullName: "Audit Client 2",
        role: "CLIENT",
        ledgerAccounts: {
          create: { accountType: "CLIENT_AVAILABLE", balanceMinor: 5000000 }, // $50,000
        },
      },
    });

    freelancer1 = await prisma.user.create({
      data: {
        email: `audit_free1_${Date.now()}@tcc.test`,
        passwordHash,
        fullName: "Audit Freelancer 1",
        role: "FREELANCER",
        ledgerAccounts: {
          create: { accountType: "FREELANCER_AVAILABLE", balanceMinor: 0 },
        },
      },
    });

    freelancer2 = await prisma.user.create({
      data: {
        email: `audit_free2_${Date.now()}@tcc.test`,
        passwordHash,
        fullName: "Audit Freelancer 2",
        role: "FREELANCER",
        ledgerAccounts: {
          create: { accountType: "FREELANCER_AVAILABLE", balanceMinor: 0 },
        },
      },
    });

    admin = await prisma.user.create({
      data: {
        email: `audit_admin_${Date.now()}@tcc.test`,
        passwordHash,
        fullName: "Audit Admin",
        role: "ADMIN",
      },
    });

    job1 = await prisma.job.create({
      data: {
        clientId: client1.id,
        title: "Audit Job 1",
        description: "Audit test job",
        category: "QA",
        budgetMinor: 1000000,
        skillsRequired: "[]",
      },
    });

    job2 = await prisma.job.create({
      data: {
        clientId: client2.id,
        title: "Audit Job 2",
        description: "Audit test job 2",
        category: "QA",
        budgetMinor: 1000000,
        skillsRequired: "[]",
      },
    });
  });

  afterAll(async () => {
    const userIds = [client1.id, client2.id, freelancer1.id, freelancer2.id, admin.id];
    const contracts = await prisma.contract.findMany({
      where: { clientId: { in: userIds } },
    });
    const contractIds = contracts.map((c) => c.id);

    await prisma.ledgerEntry.deleteMany({ where: { contractId: { in: contractIds } } });
    await prisma.escrowRecord.deleteMany({ where: { contractId: { in: contractIds } } });
    await prisma.workSubmission.deleteMany({ where: { contractId: { in: contractIds } } });
    await prisma.dispute.deleteMany({ where: { contractId: { in: contractIds } } });
    await prisma.milestone.deleteMany({ where: { contractId: { in: contractIds } } });
    await prisma.contract.deleteMany({ where: { id: { in: contractIds } } });
    await prisma.job.deleteMany({ where: { id: { in: [job1.id, job2.id] } } });
    await prisma.ledgerAccount.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  // PRIORITY 3: Genuinely concurrent release requests against the same milestone
  it("prevents double-spending under concurrent release requests on the same milestone", async () => {
    const contract = await prisma.contract.create({
      data: {
        jobId: job1.id,
        clientId: client1.id,
        freelancerId: freelancer1.id,
        title: "Concurrent Same-Milestone Contract",
        totalAmountMinor: 100000, // $1,000.00
        feeBps: 1000,
        status: "CREATED",
        milestones: {
          create: [
            {
              title: "Deliverable 1",
              description: "Milestone for concurrency",
              amountMinor: 100000,
              feeBps: 1000,
              orderIndex: 0,
              status: "PENDING",
            },
          ],
        },
      },
    });

    await fundContractEscrow(contract.id, client1.id);
    await submitContractWork(contract.id, freelancer1.id, "Submission for concurrency test");

    // Capture initial balances
    const initialFreelancer = await prisma.ledgerAccount.findFirst({
      where: { userId: freelancer1.id, accountType: "FREELANCER_AVAILABLE" },
    });
    const initialFreeBalance = initialFreelancer?.balanceMinor ?? 0;

    // Fire 4 simultaneous release requests
    const results = await Promise.allSettled([
      approveAndReleaseSimulated(contract.id, client1.id),
      approveAndReleaseSimulated(contract.id, client1.id),
      approveAndReleaseSimulated(contract.id, client1.id),
      approveAndReleaseSimulated(contract.id, client1.id),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    // Exactly 1 must succeed; the other 3 must be rejected
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(3);

    // Verify freelancer balance was credited exactly ONCE ($900.00 = 90,000 cents)
    const finalFreelancer = await prisma.ledgerAccount.findFirst({
      where: { userId: freelancer1.id, accountType: "FREELANCER_AVAILABLE" },
    });
    expect(finalFreelancer?.balanceMinor).toBe(initialFreeBalance + 90000);

    // Verify exactly ONE ESCROW_RELEASE and ONE PLATFORM_FEE entry exists
    const entries = await prisma.ledgerEntry.findMany({
      where: { contractId: contract.id },
    });
    const releaseEntries = entries.filter((e) => e.referenceType === "ESCROW_RELEASE");
    const feeEntries = entries.filter((e) => e.referenceType === "PLATFORM_FEE");

    expect(releaseEntries.length).toBe(1);
    expect(releaseEntries[0].amountMinor).toBe(90000);
    expect(feeEntries.length).toBe(1);
    expect(feeEntries[0].amountMinor).toBe(10000);

    // Verify escrowRecord is RELEASED
    const escrow = await prisma.escrowRecord.findUnique({ where: { contractId: contract.id } });
    expect(escrow?.status).toBe("RELEASED");
  });

  // PRIORITY 3: Concurrent releases on DIFFERENT contracts sharing PLATFORM_ESCROW_HOLDING
  it("processes concurrent releases across different contracts sharing platform holding correctly", async () => {
    // Contract A: $500 (50,000 cents)
    const contractA = await prisma.contract.create({
      data: {
        jobId: job1.id,
        clientId: client1.id,
        freelancerId: freelancer1.id,
        title: "Multi-Contract A",
        totalAmountMinor: 50000,
        feeBps: 1000,
        status: "CREATED",
        milestones: {
          create: [{ title: "MA", description: "Desc A", amountMinor: 50000, feeBps: 1000, orderIndex: 0, status: "PENDING" }],
        },
      },
    });

    // Contract B: $800 (80,000 cents)
    const contractB = await prisma.contract.create({
      data: {
        jobId: job2.id,
        clientId: client2.id,
        freelancerId: freelancer2.id,
        title: "Multi-Contract B",
        totalAmountMinor: 80000,
        feeBps: 1000,
        status: "CREATED",
        milestones: {
          create: [{ title: "MB", description: "Desc B", amountMinor: 80000, feeBps: 1000, orderIndex: 0, status: "PENDING" }],
        },
      },
    });

    await fundContractEscrow(contractA.id, client1.id);
    await fundContractEscrow(contractB.id, client2.id);

    await submitContractWork(contractA.id, freelancer1.id, "Work A");
    await submitContractWork(contractB.id, freelancer2.id, "Work B");

    const holdingBefore = await prisma.ledgerAccount.findFirst({
      where: { userId: null, accountType: "PLATFORM_ESCROW_HOLDING" },
    });
    const platformFeeBefore = await prisma.ledgerAccount.findFirst({
      where: { userId: null, accountType: "PLATFORM_FEE_REVENUE" },
    });

    // Execute both releases concurrently
    const [resA, resB] = await Promise.all([
      approveAndReleaseSimulated(contractA.id, client1.id),
      approveAndReleaseSimulated(contractB.id, client2.id),
    ]);

    expect(resA.status).toBe("RELEASED_SIMULATED");
    expect(resB.status).toBe("RELEASED_SIMULATED");

    // Contract A: 45,000 net, 5,000 fee
    // Contract B: 72,000 net, 8,000 fee
    // Platform holding should decrement by 50,000 + 80,000 = 130,000
    // Platform fee revenue should increment by 5,000 + 8,000 = 13,000
    const holdingAfter = await prisma.ledgerAccount.findFirst({
      where: { userId: null, accountType: "PLATFORM_ESCROW_HOLDING" },
    });
    const platformFeeAfter = await prisma.ledgerAccount.findFirst({
      where: { userId: null, accountType: "PLATFORM_FEE_REVENUE" },
    });

    expect(holdingAfter?.balanceMinor).toBe((holdingBefore?.balanceMinor ?? 0) - 130000);
    expect(platformFeeAfter?.balanceMinor).toBe((platformFeeBefore?.balanceMinor ?? 0) + 13000);
  });

  // PRIORITY 4: Refunds cannot spend already-released escrow funds
  it("prevents dispute refund from spending already-released escrow funds", async () => {
    const contract = await prisma.contract.create({
      data: {
        jobId: job1.id,
        clientId: client1.id,
        freelancerId: freelancer1.id,
        title: "Post-Release Dispute Guard Contract",
        totalAmountMinor: 60000,
        feeBps: 1000,
        status: "CREATED",
        milestones: {
          create: [{ title: "M", description: "Desc", amountMinor: 60000, feeBps: 1000, orderIndex: 0, status: "PENDING" }],
        },
      },
    });

    await fundContractEscrow(contract.id, client1.id);
    await submitContractWork(contract.id, freelancer1.id, "Submission");
    await approveAndReleaseSimulated(contract.id, client1.id);

    // Verify contract is RELEASED_SIMULATED and escrow is RELEASED
    const escrow = await prisma.escrowRecord.findUnique({ where: { contractId: contract.id } });
    expect(escrow?.status).toBe("RELEASED");

    // Attempting to file a dispute on a RELEASED contract must fail
    await expect(
      fileContractDispute(contract.id, client1.id, "Attempted dispute after release")
    ).rejects.toThrow();

    // Even if a dispute somehow existed, resolving it with REFUND_TO_CLIENT must fail
    // Create a mock dispute directly in db to test the safeguard
    const artificialDispute = await prisma.dispute.create({
      data: {
        contractId: contract.id,
        initiatorId: client1.id,
        reason: "Artificial dispute",
        status: "OPEN",
      },
    });

    await expect(
      resolveContractDisputeSimulated(artificialDispute.id, admin.id, "REFUND_TO_CLIENT", "Attempted illegal refund")
    ).rejects.toThrow(/not DISPUTED/i);

    // Clean up artificial dispute
    await prisma.dispute.delete({ where: { id: artificialDispute.id } });
  });

  // PRIORITY 4: Dispute resolution cannot race with approval and release
  it("prevents race condition between dispute resolution and client release", async () => {
    const contract = await prisma.contract.create({
      data: {
        jobId: job1.id,
        clientId: client1.id,
        freelancerId: freelancer1.id,
        title: "Dispute vs Release Race Contract",
        totalAmountMinor: 40000,
        feeBps: 1000,
        status: "CREATED",
        milestones: {
          create: [{ title: "M", description: "Desc", amountMinor: 40000, feeBps: 1000, orderIndex: 0, status: "PENDING" }],
        },
      },
    });

    await fundContractEscrow(contract.id, client1.id);
    const { dispute } = await fileContractDispute(contract.id, client1.id, "Contested quality");

    // Client attempts to approve/release while dispute is open
    // Ordinary approval must be strictly rejected by FSM
    await expect(
      approveAndReleaseSimulated(contract.id, client1.id)
    ).rejects.toThrow(/disputed contract cannot be released through the ordinary path/i);

    // Admin resolves dispute
    const resolved = await resolveContractDisputeSimulated(
      dispute.id,
      admin.id,
      "RELEASE_TO_FREELANCER",
      "Resolved by admin"
    );
    expect(resolved.status).toBe("RESOLVED_RELEASE");

    // Subsequent approval must also fail because contract is now RELEASED_SIMULATED
    await expect(
      approveAndReleaseSimulated(contract.id, client1.id)
    ).rejects.toThrow();
  });

  // PRIORITY 2: Preserving explicit one-milestone restriction
  it("explicitly enforces the one-milestone restriction in simulated-escrow mode", async () => {
    const multiMilestoneContract = await prisma.contract.create({
      data: {
        jobId: job1.id,
        clientId: client1.id,
        freelancerId: freelancer1.id,
        title: "Multi-Milestone Restricted Contract",
        totalAmountMinor: 100000,
        feeBps: 1000,
        status: "CREATED",
        milestones: {
          create: [
            { title: "Milestone 1", description: "Part 1", amountMinor: 50000, feeBps: 1000, orderIndex: 0, status: "PENDING" },
            { title: "Milestone 2", description: "Part 2", amountMinor: 50000, feeBps: 1000, orderIndex: 1, status: "PENDING" },
          ],
        },
      },
    });

    await fundContractEscrow(multiMilestoneContract.id, client1.id);
    await submitContractWork(multiMilestoneContract.id, freelancer1.id, "Submitted work for multi-milestone");

    // Attempting release on a multi-milestone contract must be rejected with explicit error
    await expect(
      approveAndReleaseSimulated(multiMilestoneContract.id, client1.id)
    ).rejects.toThrow(/MULTI_MILESTONE_UNSUPPORTED/i);
  });

  // PRIORITY 6: Enforce milestone feeBps as primary source of truth over contract feeBps
  it("enforces milestone.feeBps as the primary source of truth for settlement terms", async () => {
    // Contract specifies 10% (1000 bps), but Milestone explicitly overrides with 5% (500 bps)
    const contract = await prisma.contract.create({
      data: {
        jobId: job1.id,
        clientId: client1.id,
        freelancerId: freelancer1.id,
        title: "Milestone Precedence Contract",
        totalAmountMinor: 100000, // $1,000.00
        feeBps: 1000, // 10% at contract level
        status: "CREATED",
        milestones: {
          create: [
            {
              title: "Special Rate Milestone",
              description: "5% promotional rate",
              amountMinor: 100000,
              feeBps: 500, // 5% at milestone level (source of truth)
              orderIndex: 0,
              status: "PENDING",
            },
          ],
        },
      },
    });

    await fundContractEscrow(contract.id, client1.id);
    await submitContractWork(contract.id, freelancer1.id, "Work delivered under 5% milestone terms");

    const releaseRes = await approveAndReleaseSimulated(contract.id, client1.id);
    expect(releaseRes.status).toBe("RELEASED_SIMULATED");

    const releaseEntry = await prisma.ledgerEntry.findFirst({
      where: { contractId: contract.id, referenceType: "ESCROW_RELEASE" },
    });
    const feeEntry = await prisma.ledgerEntry.findFirst({
      where: { contractId: contract.id, referenceType: "PLATFORM_FEE" },
    });

    // Must be 5% ($50.00 = 5,000 cents) and 95% ($950.00 = 95,000 cents), NOT 10%
    expect(feeEntry?.amountMinor).toBe(5000);
    expect(releaseEntry?.amountMinor).toBe(95000);
    expect(releaseEntry!.amountMinor + feeEntry!.amountMinor).toBe(100000);
  });

  // PRIORITY 7: Floor-rounding policy across split milestone payments
  it("verifies exact integer conservation and floor-rounding across split milestone payments", () => {
    // Contract total: $1,000.00 (100,000 cents) split into 3 payments:
    // P1: 33,333 cents
    // P2: 33,333 cents
    // P3: 33,334 cents
    const p1 = 33333;
    const p2 = 33333;
    const p3 = 33334;
    expect(p1 + p2 + p3).toBe(100000);

    const s1 = calculateSettlement(p1, 1000);
    const s2 = calculateSettlement(p2, 1000);
    const s3 = calculateSettlement(p3, 1000);

    // Floor rounding: floor(33333 * 1000 / 10000) = floor(3333.3) = 3333
    expect(s1.feeMinor).toBe(3333);
    expect(s1.netFreelancerMinor).toBe(30000);
    expect(s1.feeMinor + s1.netFreelancerMinor).toBe(p1);

    expect(s2.feeMinor).toBe(3333);
    expect(s2.netFreelancerMinor).toBe(30000);
    expect(s2.feeMinor + s2.netFreelancerMinor).toBe(p2);

    // Floor rounding: floor(33334 * 1000 / 10000) = floor(3333.4) = 3333
    expect(s3.feeMinor).toBe(3333);
    expect(s3.netFreelancerMinor).toBe(30001);
    expect(s3.feeMinor + s3.netFreelancerMinor).toBe(p3);

    // Aggregate conservation:
    const totalFee = s1.feeMinor + s2.feeMinor + s3.feeMinor;
    const totalFreelancer = s1.netFreelancerMinor + s2.netFreelancerMinor + s3.netFreelancerMinor;

    expect(totalFee).toBe(9999); // $99.99 (floor truncation benefits user by 1 cent total)
    expect(totalFreelancer).toBe(90001); // $900.01
    expect(totalFee + totalFreelancer).toBe(100000); // 100% exact conservation of principal
  });

  // PRIORITY 5: Double-entry journal balancing & immutability invariant
  it("verifies double-entry journal balance and non-zero positive amounts for all ledger entries", async () => {
    const allEntries = await prisma.ledgerEntry.findMany({
      include: {
        debitAccount: true,
        creditAccount: true,
      },
    });

    expect(allEntries.length).toBeGreaterThan(0);

    for (const entry of allEntries) {
      // Invariant 1: Positive integer amount
      expect(entry.amountMinor).toBeGreaterThan(0);

      // Invariant 2: Debit account and credit account must be distinct
      expect(entry.debitAccountId).not.toBe(entry.creditAccountId);

      // Invariant 3: Valid reference types
      expect([
        "SIMULATED_DEPOSIT",
        "ESCROW_LOCK",
        "ESCROW_RELEASE",
        "ESCROW_REFUND",
        "PLATFORM_FEE",
      ]).toContain(entry.referenceType);
    }
  });
});

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/db";
import {
  validateEscrowTransition,
  EscrowTransitionError,
} from "../src/lib/escrow/stateMachine";
import {
  fundContractEscrow,
  submitContractWork,
  approveAndReleaseSimulated,
  fileContractDispute,
  resolveContractDisputeSimulated,
} from "../src/lib/escrow/escrowService";
import bcrypt from "bcryptjs";

describe("Escrow Finite State Machine (Pure Logic)", () => {
  it("allows CLIENT to fund a CREATED contract", () => {
    const nextState = validateEscrowTransition("CREATED", "FUND_ESCROW", "CLIENT");
    expect(nextState).toBe("FUNDED_SIMULATED");
  });

  it("prevents FREELANCER from funding a contract", () => {
    expect(() => {
      validateEscrowTransition("CREATED", "FUND_ESCROW", "FREELANCER");
    }).toThrow(EscrowTransitionError);
  });

  it("prevents CLIENT from submitting work", () => {
    expect(() => {
      validateEscrowTransition("FUNDED_SIMULATED", "SUBMIT_WORK", "CLIENT");
    }).toThrow(EscrowTransitionError);
  });

  it("allows FREELANCER to submit work on FUNDED contract", () => {
    const nextState = validateEscrowTransition("FUNDED_SIMULATED", "SUBMIT_WORK", "FREELANCER");
    expect(nextState).toBe("SUBMITTED");
  });

  it("prevents FREELANCER from approving their own work", () => {
    expect(() => {
      validateEscrowTransition("SUBMITTED", "APPROVE_WORK", "FREELANCER");
    }).toThrow(EscrowTransitionError);
  });

  it("allows CLIENT to approve submitted work", () => {
    const nextState = validateEscrowTransition("SUBMITTED", "APPROVE_WORK", "CLIENT");
    expect(nextState).toBe("APPROVED");
  });

  it("strictly prevents ordinary release on a DISPUTED contract", () => {
    expect(() => {
      validateEscrowTransition("DISPUTED", "APPROVE_WORK", "CLIENT");
    }).toThrow(/disputed contract cannot be released through the ordinary path/i);

    expect(() => {
      validateEscrowTransition("DISPUTED", "RELEASE_FUNDS", "CLIENT");
    }).toThrow(/disputed contract cannot be released through the ordinary path/i);
  });

  it("prevents any mutations on terminal RELEASED_SIMULATED contract", () => {
    expect(() => {
      validateEscrowTransition("RELEASED_SIMULATED", "RELEASE_FUNDS", "CLIENT");
    }).toThrow(/terminal contract state/i);
  });
});

describe("Escrow & Ledger Integrated Domain Operations", () => {
  let testClient: any;
  let testFreelancer: any;
  let testAdmin: any;
  let testJob: any;
  let testContract: any;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash("TestPass123!", 10);

    // Create test accounts
    testClient = await prisma.user.create({
      data: {
        email: `testclient_${Date.now()}@tcc.test`,
        passwordHash,
        fullName: "Test Client",
        role: "CLIENT",
        ledgerAccounts: {
          create: {
            accountType: "CLIENT_AVAILABLE",
            balanceMinor: 500000, // $5,000.00
          },
        },
      },
    });

    testFreelancer = await prisma.user.create({
      data: {
        email: `testfree_${Date.now()}@tcc.test`,
        passwordHash,
        fullName: "Test Freelancer",
        role: "FREELANCER",
        ledgerAccounts: {
          create: {
            accountType: "FREELANCER_AVAILABLE",
            balanceMinor: 0,
          },
        },
      },
    });

    testAdmin = await prisma.user.create({
      data: {
        email: `testadmin_${Date.now()}@tcc.test`,
        passwordHash,
        fullName: "Test Admin",
        role: "ADMIN",
      },
    });

    testJob = await prisma.job.create({
      data: {
        clientId: testClient.id,
        title: "Test Escrow Execution Job",
        description: "Validating full lifecycle of simulated escrow",
        category: "Testing",
        budgetMinor: 100000, // $1,000.00
        skillsRequired: JSON.stringify(["Testing"]),
      },
    });

    testContract = await prisma.contract.create({
      data: {
        jobId: testJob.id,
        clientId: testClient.id,
        freelancerId: testFreelancer.id,
        title: "Test Contract Execution",
        totalAmountMinor: 100000, // $1,000.00
        status: "CREATED",
        milestones: {
          create: [
            {
              title: "Test Milestone",
              description: "Deliver test suite",
              amountMinor: 100000,
              orderIndex: 0,
              status: "PENDING",
            },
          ],
        },
      },
    });
  });

  afterAll(async () => {
    // Cleanup created test records
    await prisma.ledgerEntry.deleteMany({ where: { contractId: testContract.id } });
    await prisma.escrowRecord.deleteMany({ where: { contractId: testContract.id } });
    await prisma.workSubmission.deleteMany({ where: { contractId: testContract.id } });
    await prisma.dispute.deleteMany({ where: { contractId: testContract.id } });
    await prisma.milestone.deleteMany({ where: { contractId: testContract.id } });
    await prisma.contract.deleteMany({ where: { id: testContract.id } });
    await prisma.job.deleteMany({ where: { id: testJob.id } });
    await prisma.ledgerAccount.deleteMany({
      where: { userId: { in: [testClient.id, testFreelancer.id, testAdmin.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [testClient.id, testFreelancer.id, testAdmin.id] } },
    });
  });

  it("rejects unauthorized client attempting to fund contract", async () => {
    await expect(
      fundContractEscrow(testContract.id, testFreelancer.id)
    ).rejects.toThrow(/Unauthorized/i);
  });

  it("funds simulated escrow atomically and creates double-entry ledger records", async () => {
    const funded = await fundContractEscrow(testContract.id, testClient.id);
    expect(funded.status).toBe("FUNDED_SIMULATED");
    expect(funded.escrowRecord?.status).toBe("HOLDING");

    // Check ledger accounts
    const clientAccount = await prisma.ledgerAccount.findFirst({
      where: { userId: testClient.id, accountType: "CLIENT_AVAILABLE" },
    });
    expect(clientAccount?.balanceMinor).toBe(400000); // 500000 - 100000

    const platformAccount = await prisma.ledgerAccount.findFirst({
      where: { userId: null, accountType: "PLATFORM_ESCROW_HOLDING" },
    });
    expect(platformAccount?.balanceMinor).toBeGreaterThanOrEqual(100000);

    // Verify double-entry ledger entry was recorded
    const entry = await prisma.ledgerEntry.findFirst({
      where: { contractId: testContract.id, referenceType: "ESCROW_LOCK" },
    });
    expect(entry).toBeDefined();
    expect(entry?.amountMinor).toBe(100000);
  });

  it("prevents duplicate escrow funding", async () => {
    await expect(
      fundContractEscrow(testContract.id, testClient.id)
    ).rejects.toThrow();
  });

  it("prevents client from submitting work", async () => {
    await expect(
      submitContractWork(testContract.id, testClient.id, "Attempted submission by client")
    ).rejects.toThrow(/Unauthorized/i);
  });

  it("allows assigned freelancer to submit work", async () => {
    const outcome = await submitContractWork(
      testContract.id,
      testFreelancer.id,
      "Finished all test requirements and implementation",
      ["https://github.com/deliverables/repo"]
    );

    expect(outcome.contract.status).toBe("SUBMITTED");
    expect(outcome.submission.notes).toContain("Finished all test requirements");
  });

  it("prevents freelancer from releasing escrow to themselves", async () => {
    await expect(
      approveAndReleaseSimulated(testContract.id, testFreelancer.id)
    ).rejects.toThrow(/Unauthorized/i);
  });

  it("allows client to approve work and release simulated escrow to freelancer with 10% fee deduction", async () => {
    const released = await approveAndReleaseSimulated(testContract.id, testClient.id);
    expect(released.status).toBe("RELEASED_SIMULATED");

    // Verify freelancer balance credited with net 90% ($900.00 of $1,000.00)
    const freelancerAccount = await prisma.ledgerAccount.findFirst({
      where: { userId: testFreelancer.id, accountType: "FREELANCER_AVAILABLE" },
    });
    expect(freelancerAccount?.balanceMinor).toBe(90000);

    // Verify double-entry release recorded for freelancer (90%)
    const releaseEntry = await prisma.ledgerEntry.findFirst({
      where: { contractId: testContract.id, referenceType: "ESCROW_RELEASE" },
    });
    expect(releaseEntry).toBeDefined();
    expect(releaseEntry?.amountMinor).toBe(90000);

    // Verify double-entry platform fee recorded (10%)
    const feeEntry = await prisma.ledgerEntry.findFirst({
      where: { contractId: testContract.id, referenceType: "PLATFORM_FEE" },
    });
    expect(feeEntry).toBeDefined();
    expect(feeEntry?.amountMinor).toBe(10000);

    // Verify platform fee revenue account received fee
    const platformFeeAccount = await prisma.ledgerAccount.findFirst({
      where: { userId: null, accountType: "PLATFORM_FEE_REVENUE" },
    });
    expect(platformFeeAccount?.balanceMinor).toBeGreaterThanOrEqual(10000);
  });

  it("prevents duplicate release of an already released contract", async () => {
    await expect(
      approveAndReleaseSimulated(testContract.id, testClient.id)
    ).rejects.toThrow(/already been released/i);
  });
});

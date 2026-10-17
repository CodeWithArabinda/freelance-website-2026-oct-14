import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/db";
import {
  fundContractEscrow,
  fileContractDispute,
  resolveContractDisputeSimulated,
  approveAndReleaseSimulated,
} from "../src/lib/escrow/escrowService";
import bcrypt from "bcryptjs";

describe("Dispute & Refund Workflow Invariants", () => {
  let client: any;
  let freelancer: any;
  let admin: any;
  let thirdParty: any;
  let job: any;
  let contract: any;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash("Pass1234!", 10);

    client = await prisma.user.create({
      data: {
        email: `dispute_client_${Date.now()}@tcc.test`,
        passwordHash,
        fullName: "Dispute Client",
        role: "CLIENT",
        ledgerAccounts: {
          create: { accountType: "CLIENT_AVAILABLE", balanceMinor: 300000 },
        },
      },
    });

    freelancer = await prisma.user.create({
      data: {
        email: `dispute_free_${Date.now()}@tcc.test`,
        passwordHash,
        fullName: "Dispute Freelancer",
        role: "FREELANCER",
        ledgerAccounts: {
          create: { accountType: "FREELANCER_AVAILABLE", balanceMinor: 0 },
        },
      },
    });

    admin = await prisma.user.create({
      data: {
        email: `dispute_admin_${Date.now()}@tcc.test`,
        passwordHash,
        fullName: "Arbitration Admin",
        role: "ADMIN",
      },
    });

    thirdParty = await prisma.user.create({
      data: {
        email: `dispute_intruder_${Date.now()}@tcc.test`,
        passwordHash,
        fullName: "Unrelated User",
        role: "FREELANCER",
      },
    });

    job = await prisma.job.create({
      data: {
        clientId: client.id,
        title: "Dispute Invariant Verification",
        description: "Checking dispute handling",
        category: "QA",
        budgetMinor: 60000,
        skillsRequired: JSON.stringify(["QA"]),
      },
    });

    contract = await prisma.contract.create({
      data: {
        jobId: job.id,
        clientId: client.id,
        freelancerId: freelancer.id,
        title: "Dispute Verification Contract",
        totalAmountMinor: 60000, // $600.00
        status: "CREATED",
        milestones: {
          create: [
            {
              title: "Primary Deliverable",
              description: "Scope of work",
              amountMinor: 60000,
              orderIndex: 0,
              status: "PENDING",
            },
          ],
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.ledgerEntry.deleteMany({ where: { contractId: contract.id } });
    await prisma.escrowRecord.deleteMany({ where: { contractId: contract.id } });
    await prisma.dispute.deleteMany({ where: { contractId: contract.id } });
    await prisma.milestone.deleteMany({ where: { contractId: contract.id } });
    await prisma.contract.deleteMany({ where: { id: contract.id } });
    await prisma.job.deleteMany({ where: { id: job.id } });
    await prisma.ledgerAccount.deleteMany({
      where: { userId: { in: [client.id, freelancer.id, thirdParty.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [client.id, freelancer.id, admin.id, thirdParty.id] } },
    });
  });

  it("funds the contract", async () => {
    const funded = await fundContractEscrow(contract.id, client.id);
    expect(funded.status).toBe("FUNDED_SIMULATED");
  });

  it("rejects dispute filing from an unrelated third party", async () => {
    await expect(
      fileContractDispute(contract.id, thirdParty.id, "Attempted intrusion dispute")
    ).rejects.toThrow(/Unauthorized/i);
  });

  it("allows client or freelancer to file dispute", async () => {
    const outcome = await fileContractDispute(
      contract.id,
      client.id,
      "Freelancer was unresponsive and did not submit required documentation"
    );
    expect(outcome.contract.status).toBe("DISPUTED");
    expect(outcome.dispute.status).toBe("OPEN");
  });

  it("strictly prevents ordinary release while contract is disputed", async () => {
    await expect(
      approveAndReleaseSimulated(contract.id, client.id)
    ).rejects.toThrow(/disputed contract cannot be released through the ordinary path/i);
  });

  it("allows admin to arbitrate and resolve dispute with refund to client", async () => {
    const dispute = await prisma.dispute.findUnique({
      where: { contractId: contract.id },
    });
    expect(dispute).toBeDefined();

    const resolved = await resolveContractDisputeSimulated(
      dispute!.id,
      admin.id,
      "REFUND_TO_CLIENT",
      "Refund granted because work was not initiated"
    );

    expect(resolved.status).toBe("RESOLVED_REFUND");

    // Verify contract status updated to REFUNDED_SIMULATED
    const updatedContract = await prisma.contract.findUnique({
      where: { id: contract.id },
      include: { escrowRecord: true },
    });
    expect(updatedContract?.status).toBe("REFUNDED_SIMULATED");
    expect(updatedContract?.escrowRecord?.status).toBe("REFUNDED");

    // Verify refund entry was created
    const refundEntry = await prisma.ledgerEntry.findFirst({
      where: { contractId: contract.id, referenceType: "ESCROW_REFUND" },
    });
    expect(refundEntry).toBeDefined();
    expect(refundEntry?.amountMinor).toBe(60000);
  });
});

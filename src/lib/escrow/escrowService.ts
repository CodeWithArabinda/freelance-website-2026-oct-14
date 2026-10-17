import { prisma } from "../db";
import { validateEscrowTransition, EscrowTransitionError } from "./stateMachine";
import { logAuditEvent } from "../audit/auditLogger";
import { calculateSettlement } from "./feePolicy";
import { LedgerAccountType } from "../types";

/**
 * Helper to ensure a ledger account exists for a user or system entity
 */
export async function getOrCreateLedgerAccount(
  tx: any,
  userId: string | null,
  accountType: LedgerAccountType
) {
  let account = await tx.ledgerAccount.findFirst({
    where: {
      userId,
      accountType,
    },
  });

  if (!account) {
    account = await tx.ledgerAccount.create({
      data: {
        userId,
        accountType,
        balanceMinor: accountType === "CLIENT_AVAILABLE" ? 1000000 : 0, // Seed test clients with $10,000.00 simulated credit
      },
    });
  }

  return account;
}

/**
 * Simulated escrow funding: Locks client's simulated funds in platform escrow holding
 */
export async function fundContractEscrow(contractId: string, clientId: string) {
  return await prisma.$transaction(async (tx) => {
    const contract = await tx.contract.findUnique({
      where: { id: contractId },
      include: { client: true, milestones: true, escrowRecord: true },
    });

    if (!contract) {
      throw new Error("Contract not found");
    }

    if (contract.clientId !== clientId) {
      throw new Error("Unauthorized: Only the client owner can fund this contract");
    }

    // Validate state transition through FSM
    validateEscrowTransition(contract.status as any, "FUND_ESCROW", "CLIENT");

    if (contract.escrowRecord && contract.escrowRecord.status === "HOLDING") {
      throw new EscrowTransitionError("Escrow for this contract has already been funded");
    }

    const amountMinor = contract.totalAmountMinor;
    if (amountMinor <= 0) {
      throw new Error("Invalid contract amount: Must be greater than 0");
    }

    // Ensure double-entry ledger accounts
    const clientAccount = await getOrCreateLedgerAccount(tx, clientId, "CLIENT_AVAILABLE");
    const platformHolding = await getOrCreateLedgerAccount(tx, null, "PLATFORM_ESCROW_HOLDING");

    if (clientAccount.balanceMinor < amountMinor) {
      // Auto-top up simulated test balance for smooth sandbox testing
      const topUpAmount = amountMinor - clientAccount.balanceMinor + 100000;
      await tx.ledgerAccount.update({
        where: { id: clientAccount.id },
        data: { balanceMinor: { increment: topUpAmount } },
      });
      await tx.ledgerEntry.create({
        data: {
          contractId,
          debitAccountId: platformHolding.id,
          creditAccountId: clientAccount.id,
          amountMinor: topUpAmount,
          referenceType: "SIMULATED_DEPOSIT",
          description: "Simulated sandbox test funds deposit",
        },
      });
    }

    // Debit client, credit platform holding
    await tx.ledgerAccount.update({
      where: { id: clientAccount.id },
      data: { balanceMinor: { decrement: amountMinor } },
    });

    await tx.ledgerAccount.update({
      where: { id: platformHolding.id },
      data: { balanceMinor: { increment: amountMinor } },
    });

    // Record double entry ledger audit
    await tx.ledgerEntry.create({
      data: {
        contractId,
        debitAccountId: clientAccount.id,
        creditAccountId: platformHolding.id,
        amountMinor,
        referenceType: "ESCROW_LOCK",
        description: `Escrow funded for Contract: ${contract.title}`,
      },
    });

    // Create or update EscrowRecord
    const escrowRecord = await tx.escrowRecord.upsert({
      where: { contractId },
      create: {
        contractId,
        amountMinor,
        status: "HOLDING",
      },
      update: {
        amountMinor,
        status: "HOLDING",
        refundedAt: null,
      },
    });

    // Advance contract state
    const updatedContract = await tx.contract.update({
      where: { id: contractId },
      data: {
        status: "FUNDED_SIMULATED",
      },
      include: { escrowRecord: true, milestones: true },
    });

    // Update milestones to FUNDED_SIMULATED
    await tx.milestone.updateMany({
      where: { contractId },
      data: { status: "FUNDED_SIMULATED" },
    });

    await logAuditEvent(
      {
        actorId: clientId,
        action: "ESCROW_FUNDED_SIMULATED",
        entityType: "CONTRACT",
        entityId: contractId,
        payload: { amountMinor, escrowRecordId: escrowRecord.id },
      },
      tx
    );

    return updatedContract;
  });
}

/**
 * Freelancer delivers work submission
 */
export async function submitContractWork(
  contractId: string,
  freelancerId: string,
  notes: string,
  attachmentUrls: string[] = []
) {
  return await prisma.$transaction(async (tx) => {
    const contract = await tx.contract.findUnique({
      where: { id: contractId },
      include: { milestones: true },
    });

    if (!contract) {
      throw new Error("Contract not found");
    }

    if (contract.freelancerId !== freelancerId) {
      throw new Error("Unauthorized: Only the assigned freelancer can submit work");
    }

    // Validate transition
    validateEscrowTransition(contract.status as any, "SUBMIT_WORK", "FREELANCER");

    const submission = await tx.workSubmission.create({
      data: {
        contractId,
        freelancerId,
        milestoneId: contract.milestones[0]?.id || null,
        notes,
        attachmentUrls: JSON.stringify(attachmentUrls),
        status: "SUBMITTED",
      },
    });

    const updatedContract = await tx.contract.update({
      where: { id: contractId },
      data: { status: "SUBMITTED" },
      include: { submissions: true, milestones: true },
    });

    await tx.milestone.updateMany({
      where: { contractId },
      data: { status: "SUBMITTED" },
    });

    await logAuditEvent(
      {
        actorId: freelancerId,
        action: "WORK_SUBMITTED",
        entityType: "CONTRACT",
        entityId: contractId,
        payload: { submissionId: submission.id, notes },
      },
      tx
    );

    return { contract: updatedContract, submission };
  });
}

/**
 * Client approves work and releases simulated escrow to freelancer
 */
export async function approveAndReleaseSimulated(contractId: string, clientId: string) {
  return await prisma.$transaction(async (tx) => {
    const contract = await tx.contract.findUnique({
      where: { id: contractId },
      include: {
        escrowRecord: true,
        milestones: true,
        submissions: true,
        freelancer: true,
      },
    });

    if (!contract) {
      throw new Error("Contract not found");
    }

    if (contract.clientId !== clientId) {
      throw new Error("Unauthorized: Only the client owner can approve work and release escrow");
    }

    if (contract.status === "DISPUTED") {
      throw new EscrowTransitionError(
        "A disputed contract cannot be released through the ordinary path. Requires admin resolution."
      );
    }

    if (contract.status === "RELEASED_SIMULATED") {
      throw new EscrowTransitionError("Contract escrow has already been released.");
    }

    // Validate state transition through FSM
    validateEscrowTransition(contract.status as any, "APPROVE_WORK", "CLIENT");

    if (contract.milestones.length > 1) {
      throw new EscrowTransitionError(
        "MULTI_MILESTONE_UNSUPPORTED: Independent multi-milestone release is not supported in the current contract-level escrow model. Contracts in simulated-escrow mode are restricted to a single milestone."
      );
    }

    const escrowRecord = contract.escrowRecord;
    if (!escrowRecord || escrowRecord.status !== "HOLDING") {
      throw new EscrowTransitionError("Escrow record is not in HOLDING state.");
    }

    const amountMinor = contract.totalAmountMinor;
    const platformHolding = await getOrCreateLedgerAccount(tx, null, "PLATFORM_ESCROW_HOLDING");
    if (platformHolding.balanceMinor < amountMinor) {
      throw new Error(
        `INSUFFICIENT_ESCROW_FUNDS: Platform holding account balance (${platformHolding.balanceMinor}) is less than release amount (${amountMinor})`
      );
    }

    // Atomic conditional status update to prevent race conditions or duplicate releases
    const transitionRes = await tx.contract.updateMany({
      where: {
        id: contractId,
        status: { in: ["SUBMITTED", "APPROVED"] },
      },
      data: {
        status: "RELEASED_SIMULATED",
      },
    });

    if (transitionRes.count === 0) {
      const current = await tx.contract.findUnique({ where: { id: contractId } });
      if (!current) throw new Error("Contract not found");
      if (current.status === "RELEASED_SIMULATED") {
        throw new EscrowTransitionError("Contract escrow has already been released.");
      }
      if (current.status === "DISPUTED") {
        throw new EscrowTransitionError(
          "A disputed contract cannot be released through the ordinary path. Requires admin resolution."
        );
      }
      throw new EscrowTransitionError(`Contract cannot be released from status: ${current.status}`);
    }

    // Atomic conditional update on escrowRecord to guarantee funds cannot be released twice
    const escrowRes = await tx.escrowRecord.updateMany({
      where: {
        contractId,
        status: "HOLDING",
      },
      data: {
        status: "RELEASED",
        releasedAt: new Date(),
      },
    });

    if (escrowRes.count === 0) {
      throw new EscrowTransitionError("Escrow record is not in HOLDING state.");
    }

    // Enforce milestone terms as primary source of truth, falling back to contract terms
    const milestone = contract.milestones[0];
    const effectiveFeeBps = milestone?.feeBps ?? contract.feeBps ?? 1000;
    const settlement = calculateSettlement(amountMinor, effectiveFeeBps);
    const freelancerAccount = await getOrCreateLedgerAccount(tx, contract.freelancerId, "FREELANCER_AVAILABLE");
    const platformFeeRevenue = await getOrCreateLedgerAccount(tx, null, "PLATFORM_FEE_REVENUE");

    // Double-entry transfer: debit platform holding by full gross amount
    await tx.ledgerAccount.update({
      where: { id: platformHolding.id },
      data: { balanceMinor: { decrement: settlement.grossAmountMinor } },
    });

    // Credit freelancer by net amount (90%)
    await tx.ledgerAccount.update({
      where: { id: freelancerAccount.id },
      data: { balanceMinor: { increment: settlement.netFreelancerMinor } },
    });

    // Credit platform fee revenue by fee amount (10%)
    if (settlement.feeMinor > 0) {
      await tx.ledgerAccount.update({
        where: { id: platformFeeRevenue.id },
        data: { balanceMinor: { increment: settlement.feeMinor } },
      });
    }

    // Record ESCROW_RELEASE entry (net payout to freelancer)
    await tx.ledgerEntry.create({
      data: {
        contractId,
        debitAccountId: platformHolding.id,
        creditAccountId: freelancerAccount.id,
        amountMinor: settlement.netFreelancerMinor,
        referenceType: "ESCROW_RELEASE",
        description: `Simulated escrow released to freelancer (net of ${settlement.feeBps / 100}% fee) for Contract: ${contract.title}`,
      },
    });

    // Record PLATFORM_FEE entry (revenue recognized on settlement)
    if (settlement.feeMinor > 0) {
      await tx.ledgerEntry.create({
        data: {
          contractId,
          debitAccountId: platformHolding.id,
          creditAccountId: platformFeeRevenue.id,
          amountMinor: settlement.feeMinor,
          referenceType: "PLATFORM_FEE",
          description: `Platform fee (${settlement.feeBps / 100}%) recognized on settlement for Contract: ${contract.title}`,
        },
      });
    }

    await tx.milestone.updateMany({
      where: { contractId },
      data: { status: "RELEASED_SIMULATED" },
    });

    await tx.workSubmission.updateMany({
      where: { contractId },
      data: { status: "ACCEPTED" },
    });

    // Update cumulative profile totals
    await tx.freelancerProfile.updateMany({
      where: { userId: contract.freelancerId },
      data: { totalEarnedMinor: { increment: settlement.netFreelancerMinor } },
    });

    await tx.clientProfile.updateMany({
      where: { userId: contract.clientId },
      data: { totalSpentMinor: { increment: settlement.grossAmountMinor } },
    });

    await logAuditEvent(
      {
        actorId: clientId,
        action: "ESCROW_RELEASED_SIMULATED",
        entityType: "CONTRACT",
        entityId: contractId,
        payload: {
          grossAmountMinor: settlement.grossAmountMinor,
          netFreelancerMinor: settlement.netFreelancerMinor,
          feeMinor: settlement.feeMinor,
          feeBps: settlement.feeBps,
          freelancerId: contract.freelancerId,
        },
      },
      tx
    );

    const updatedContract = await tx.contract.findUnique({
      where: { id: contractId },
      include: { escrowRecord: true, milestones: true },
    });

    return updatedContract;
  });
}

/**
 * File formal dispute
 */
export async function fileContractDispute(
  contractId: string,
  initiatorId: string,
  reason: string
) {
  return await prisma.$transaction(async (tx) => {
    const contract = await tx.contract.findUnique({
      where: { id: contractId },
      include: { dispute: true },
    });

    if (!contract) {
      throw new Error("Contract not found");
    }

    if (contract.clientId !== initiatorId && contract.freelancerId !== initiatorId) {
      throw new Error("Unauthorized: Only contract participants can file a dispute");
    }

    if (contract.dispute) {
      throw new Error("A dispute is already open for this contract");
    }

    const initiatorRole = contract.clientId === initiatorId ? "CLIENT" : "FREELANCER";
    validateEscrowTransition(contract.status as any, "FILE_DISPUTE", initiatorRole);

    const dispute = await tx.dispute.create({
      data: {
        contractId,
        initiatorId,
        reason,
        status: "OPEN",
      },
    });

    const updateRes = await tx.contract.updateMany({
      where: {
        id: contractId,
        status: { in: ["FUNDED_SIMULATED", "IN_PROGRESS", "SUBMITTED", "APPROVED"] },
      },
      data: { status: "DISPUTED" },
    });

    if (updateRes.count === 0) {
      throw new EscrowTransitionError("Contract cannot be disputed in its current status.");
    }

    const updatedContract = await tx.contract.findUnique({
      where: { id: contractId },
    });

    await tx.milestone.updateMany({
      where: { contractId },
      data: { status: "DISPUTED" },
    });

    await logAuditEvent(
      {
        actorId: initiatorId,
        action: "DISPUTE_FILED",
        entityType: "DISPUTE",
        entityId: dispute.id,
        payload: { contractId, reason },
      },
      tx
    );

    return { dispute, contract: updatedContract };
  });
}

/**
 * Administrator resolves dispute with either full release or full refund
 */
export async function resolveContractDisputeSimulated(
  disputeId: string,
  adminId: string,
  resolution: "RELEASE_TO_FREELANCER" | "REFUND_TO_CLIENT",
  resolutionNotes: string
) {
  return await prisma.$transaction(async (tx) => {
    const dispute = await tx.dispute.findUnique({
      where: { id: disputeId },
      include: {
        contract: {
          include: { escrowRecord: true, milestones: true },
        },
      },
    });

    if (!dispute) {
      throw new Error("Dispute not found");
    }

    if (dispute.status !== "OPEN") {
      throw new EscrowTransitionError("Dispute is already resolved");
    }

    const contract = dispute.contract;
    if (contract.status !== "DISPUTED") {
      throw new EscrowTransitionError(`Cannot resolve dispute: Contract is in status ${contract.status}, not DISPUTED`);
    }

    if (!contract.escrowRecord || contract.escrowRecord.status !== "HOLDING") {
      throw new EscrowTransitionError("Cannot resolve dispute: Escrow funds are not in HOLDING state (already released or refunded).");
    }

    const amountMinor = contract.totalAmountMinor;
    const platformHolding = await getOrCreateLedgerAccount(tx, null, "PLATFORM_ESCROW_HOLDING");

    if (platformHolding.balanceMinor < amountMinor) {
      throw new Error(
        `INSUFFICIENT_ESCROW_FUNDS: Platform holding account balance (${platformHolding.balanceMinor}) is less than required amount (${amountMinor})`
      );
    }

    // 1. Atomic dispute status transition
    const disputeRes = await tx.dispute.updateMany({
      where: {
        id: disputeId,
        status: "OPEN",
      },
      data: {
        status: resolution === "RELEASE_TO_FREELANCER" ? "RESOLVED_RELEASE" : "RESOLVED_REFUND",
        resolutionNotes,
        resolvedById: adminId,
        resolvedAt: new Date(),
      },
    });

    if (disputeRes.count === 0) {
      throw new EscrowTransitionError("Dispute has already been resolved or is not OPEN.");
    }

    // 2. Atomic contract status transition
    const targetContractStatus = resolution === "RELEASE_TO_FREELANCER" ? "RELEASED_SIMULATED" : "REFUNDED_SIMULATED";
    const contractRes = await tx.contract.updateMany({
      where: {
        id: contract.id,
        status: "DISPUTED",
      },
      data: {
        status: targetContractStatus,
      },
    });

    if (contractRes.count === 0) {
      throw new EscrowTransitionError("Contract is not in DISPUTED state.");
    }

    // 3. Atomic escrow record status transition
    const targetEscrowStatus = resolution === "RELEASE_TO_FREELANCER" ? "RELEASED" : "REFUNDED";
    const escrowRes = await tx.escrowRecord.updateMany({
      where: {
        contractId: contract.id,
        status: "HOLDING",
      },
      data: {
        status: targetEscrowStatus,
        releasedAt: resolution === "RELEASE_TO_FREELANCER" ? new Date() : null,
        refundedAt: resolution === "REFUND_TO_CLIENT" ? new Date() : null,
      },
    });

    if (escrowRes.count === 0) {
      throw new EscrowTransitionError("Escrow funds cannot be refunded or released because escrow is not in HOLDING state.");
    }

    if (resolution === "RELEASE_TO_FREELANCER") {
      const milestone = contract.milestones?.[0];
      const effectiveFeeBps = milestone?.feeBps ?? contract.feeBps ?? 1000;
      const settlement = calculateSettlement(amountMinor, effectiveFeeBps);
      const freelancerAccount = await getOrCreateLedgerAccount(
        tx,
        contract.freelancerId,
        "FREELANCER_AVAILABLE"
      );
      const platformFeeRevenue = await getOrCreateLedgerAccount(tx, null, "PLATFORM_FEE_REVENUE");

      await tx.ledgerAccount.update({
        where: { id: platformHolding.id },
        data: { balanceMinor: { decrement: settlement.grossAmountMinor } },
      });

      await tx.ledgerAccount.update({
        where: { id: freelancerAccount.id },
        data: { balanceMinor: { increment: settlement.netFreelancerMinor } },
      });

      if (settlement.feeMinor > 0) {
        await tx.ledgerAccount.update({
          where: { id: platformFeeRevenue.id },
          data: { balanceMinor: { increment: settlement.feeMinor } },
        });
      }

      await tx.ledgerEntry.create({
        data: {
          contractId: contract.id,
          debitAccountId: platformHolding.id,
          creditAccountId: freelancerAccount.id,
          amountMinor: settlement.netFreelancerMinor,
          referenceType: "ESCROW_RELEASE",
          description: `Dispute resolved in favor of freelancer (net payout): ${resolutionNotes}`,
        },
      });

      if (settlement.feeMinor > 0) {
        await tx.ledgerEntry.create({
          data: {
            contractId: contract.id,
            debitAccountId: platformHolding.id,
            creditAccountId: platformFeeRevenue.id,
            amountMinor: settlement.feeMinor,
            referenceType: "PLATFORM_FEE",
            description: `Dispute resolution platform fee (${settlement.feeBps / 100}%): ${resolutionNotes}`,
          },
        });
      }

      await tx.milestone.updateMany({
        where: { contractId: contract.id },
        data: { status: "RELEASED_SIMULATED" },
      });

      // Update profile totals
      await tx.freelancerProfile.updateMany({
        where: { userId: contract.freelancerId },
        data: { totalEarnedMinor: { increment: settlement.netFreelancerMinor } },
      });

      await tx.clientProfile.updateMany({
        where: { userId: contract.clientId },
        data: { totalSpentMinor: { increment: settlement.grossAmountMinor } },
      });
    } else {
      // 100% full principal refund with zero fee charged
      const clientAccount = await getOrCreateLedgerAccount(tx, contract.clientId, "CLIENT_AVAILABLE");

      await tx.ledgerAccount.update({
        where: { id: platformHolding.id },
        data: { balanceMinor: { decrement: amountMinor } },
      });

      await tx.ledgerAccount.update({
        where: { id: clientAccount.id },
        data: { balanceMinor: { increment: amountMinor } },
      });

      await tx.ledgerEntry.create({
        data: {
          contractId: contract.id,
          debitAccountId: platformHolding.id,
          creditAccountId: clientAccount.id,
          amountMinor,
          referenceType: "ESCROW_REFUND",
          description: `Dispute resolved with simulated refund to client: ${resolutionNotes}`,
        },
      });

      await tx.milestone.updateMany({
        where: { contractId: contract.id },
        data: { status: "REFUNDED_SIMULATED" },
      });
    }

    const updatedDispute = await tx.dispute.findUnique({
      where: { id: disputeId },
    });

    await logAuditEvent(
      {
        actorId: adminId,
        action: "DISPUTE_RESOLVED",
        entityType: "DISPUTE",
        entityId: disputeId,
        payload: { resolution, resolutionNotes },
      },
      tx
    );

    return updatedDispute;
  });
}

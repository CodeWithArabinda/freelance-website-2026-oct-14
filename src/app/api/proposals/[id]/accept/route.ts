import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit/auditLogger";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const proposalId = params.id;
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        job: true,
        contract: true,
      },
    });

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    if (proposal.job.clientId !== session.userId && session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only the client who posted the job can accept this proposal" },
        { status: 403 }
      );
    }

    if (proposal.contract) {
      return NextResponse.json(
        { error: "A contract has already been established from this proposal" },
        { status: 409 }
      );
    }

    if (proposal.status !== "PENDING") {
      return NextResponse.json(
        { error: `Cannot accept proposal with status: ${proposal.status}` },
        { status: 400 }
      );
    }

    // Atomic transaction: accept proposal, close other proposals if preferred, create Contract & Milestone
    const contract = await prisma.$transaction(async (tx) => {
      await tx.proposal.update({
        where: { id: proposalId },
        data: { status: "ACCEPTED" },
      });

      // Update job status to IN_PROGRESS
      await tx.job.update({
        where: { id: proposal.jobId },
        data: { status: "IN_PROGRESS" },
      });

      const newContract = await tx.contract.create({
        data: {
          jobId: proposal.jobId,
          clientId: proposal.job.clientId,
          freelancerId: proposal.freelancerId,
          proposalId: proposal.id,
          title: `Contract: ${proposal.job.title}`,
          totalAmountMinor: proposal.bidAmountMinor,
          feeBps: 1000,
          status: "CREATED",
          milestones: {
            create: [
              {
                title: "Primary Delivery Milestone",
                description: `Complete deliverables as outlined in accepted proposal. Estimated days: ${proposal.estimatedDays}`,
                amountMinor: proposal.bidAmountMinor,
                feeBps: 1000,
                orderIndex: 0,
                status: "PENDING",
              },
            ],
          },
        },
        include: {
          milestones: true,
          client: { select: { id: true, fullName: true } },
          freelancer: { select: { id: true, fullName: true } },
        },
      });

      return newContract;
    });

    await logAuditEvent({
      actorId: session.userId,
      action: "PROPOSAL_ACCEPTED",
      entityType: "CONTRACT",
      entityId: contract.id,
      payload: { proposalId, totalAmountMinor: contract.totalAmountMinor },
    });

    return NextResponse.json({ success: true, contract });
  } catch (error) {
    console.error("Accept proposal error:", error);
    return NextResponse.json({ error: "Failed to accept proposal" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { CreateProposalSchema } from "@/lib/validations/jobs";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit/auditLogger";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "FREELANCER" && session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only freelancers can submit proposals" },
        { status: 403 }
      );
    }

    const jobId = params.id;
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status !== "OPEN") {
      return NextResponse.json(
        { error: "This job is no longer accepting proposals" },
        { status: 400 }
      );
    }

    if (job.clientId === session.userId) {
      return NextResponse.json(
        { error: "Forbidden: You cannot submit a proposal to your own job listing" },
        { status: 403 }
      );
    }

    // Check duplicate proposal
    const existingProposal = await prisma.proposal.findFirst({
      where: {
        jobId,
        freelancerId: session.userId,
      },
    });

    if (existingProposal) {
      return NextResponse.json(
        { error: "You have already submitted a proposal for this job" },
        { status: 409 }
      );
    }

    const body = await req.json();
    const result = CreateProposalSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { bidAmountMinor, coverLetter, estimatedDays } = result.data;

    const proposal = await prisma.proposal.create({
      data: {
        jobId,
        freelancerId: session.userId,
        bidAmountMinor,
        coverLetter,
        estimatedDays,
        status: "PENDING",
      },
      include: {
        freelancer: {
          select: { id: true, fullName: true, freelancerProfile: true },
        },
      },
    });

    await logAuditEvent({
      actorId: session.userId,
      action: "PROPOSAL_SUBMITTED",
      entityType: "PROPOSAL",
      entityId: proposal.id,
      payload: { jobId, bidAmountMinor },
    });

    return NextResponse.json({ success: true, proposal }, { status: 201 });
  } catch (error) {
    console.error("Create proposal error:", error);
    return NextResponse.json({ error: "Failed to submit proposal" }, { status: 500 });
  }
}

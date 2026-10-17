import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contractId = params.id;
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        job: true,
        client: {
          select: { id: true, fullName: true, email: true, clientProfile: true },
        },
        freelancer: {
          select: { id: true, fullName: true, email: true, freelancerProfile: true },
        },
        milestones: {
          orderBy: { orderIndex: "asc" },
        },
        escrowRecord: true,
        submissions: {
          orderBy: { submittedAt: "desc" },
        },
        dispute: {
          include: {
            initiator: {
              select: { id: true, fullName: true, role: true },
            },
          },
        },
        ledgerEntries: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Role verification
    const isParticipant =
      contract.clientId === session.userId ||
      contract.freelancerId === session.userId ||
      session.role === "ADMIN";

    if (!isParticipant) {
      return NextResponse.json(
        { error: "Forbidden: You are not a party to this contract" },
        { status: 403 }
      );
    }

    const formattedSubmissions = contract.submissions.map((s) => {
      let attachments: string[] = [];
      try {
        attachments = JSON.parse(s.attachmentUrls);
      } catch {
        attachments = [];
      }
      return {
        ...s,
        attachmentUrls: attachments,
      };
    });

    return NextResponse.json({
      contract: {
        ...contract,
        submissions: formattedSubmissions,
        isClient: session.userId === contract.clientId,
        isFreelancer: session.userId === contract.freelancerId,
        isAdmin: session.role === "ADMIN",
      },
    });
  } catch (error) {
    console.error("Fetch contract error:", error);
    return NextResponse.json({ error: "Failed to fetch contract details" }, { status: 500 });
  }
}

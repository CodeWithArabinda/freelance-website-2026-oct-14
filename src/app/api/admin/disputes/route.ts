import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const disputes = await prisma.dispute.findMany({
      include: {
        initiator: {
          select: { id: true, fullName: true, role: true, email: true },
        },
        contract: {
          include: {
            client: { select: { id: true, fullName: true, email: true } },
            freelancer: { select: { id: true, fullName: true, email: true } },
            milestones: true,
            submissions: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ disputes });
  } catch (error) {
    console.error("Fetch admin disputes error:", error);
    return NextResponse.json({ error: "Failed to fetch disputes" }, { status: 500 });
  }
}

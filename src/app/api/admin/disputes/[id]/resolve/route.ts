import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveContractDisputeSimulated } from "@/lib/escrow/escrowService";
import { ResolveDisputeSchema } from "@/lib/validations/contracts";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only platform administrators can arbitrate disputes" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = ResolveDisputeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const disputeId = params.id;
    const { resolution, resolutionNotes } = result.data;

    const updatedDispute = await resolveContractDisputeSimulated(
      disputeId,
      session.userId,
      resolution,
      resolutionNotes
    );

    return NextResponse.json({
      success: true,
      message: `Dispute resolved successfully: ${resolution}`,
      dispute: updatedDispute,
    });
  } catch (error: any) {
    console.error("Resolve dispute error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to resolve dispute" },
      { status: 500 }
    );
  }
}

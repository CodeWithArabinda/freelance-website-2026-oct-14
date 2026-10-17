import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { approveAndReleaseSimulated } from "@/lib/escrow/escrowService";
import { EscrowTransitionError } from "@/lib/escrow/stateMachine";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contractId = params.id;
    const contract = await approveAndReleaseSimulated(contractId, session.userId);

    return NextResponse.json({
      success: true,
      message: "Work approved and simulated escrow released to freelancer",
      contract,
    });
  } catch (error: any) {
    console.error("Approve and release error:", error);
    if (error instanceof EscrowTransitionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error.message?.includes("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to approve and release contract" },
      { status: 500 }
    );
  }
}

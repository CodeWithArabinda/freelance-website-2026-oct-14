import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { fileContractDispute } from "@/lib/escrow/escrowService";
import { FileDisputeSchema } from "@/lib/validations/contracts";
import { EscrowTransitionError } from "@/lib/escrow/stateMachine";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = FileDisputeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const contractId = params.id;
    const { reason } = result.data;

    const outcome = await fileContractDispute(contractId, session.userId, reason);

    return NextResponse.json({
      success: true,
      message: "Formal dispute initiated. An administrator will review this case.",
      ...outcome,
    });
  } catch (error: any) {
    console.error("Dispute filing error:", error);
    if (error instanceof EscrowTransitionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error.message?.includes("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to file dispute" },
      { status: 500 }
    );
  }
}

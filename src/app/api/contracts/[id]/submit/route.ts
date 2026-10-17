import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { submitContractWork } from "@/lib/escrow/escrowService";
import { SubmitWorkSchema } from "@/lib/validations/contracts";
import { EscrowTransitionError } from "@/lib/escrow/stateMachine";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = SubmitWorkSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const contractId = params.id;
    const { notes, attachmentUrls } = result.data;

    const outcome = await submitContractWork(
      contractId,
      session.userId,
      notes,
      attachmentUrls
    );

    return NextResponse.json({
      success: true,
      message: "Work submitted successfully for client review",
      ...outcome,
    });
  } catch (error: any) {
    console.error("Submit work error:", error);
    if (error instanceof EscrowTransitionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error.message?.includes("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to submit deliverables" },
      { status: 500 }
    );
  }
}

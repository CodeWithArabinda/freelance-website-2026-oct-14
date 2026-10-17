import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = session.role === "ADMIN";

    // User accounts
    const userAccounts = await prisma.ledgerAccount.findMany({
      where: isAdmin ? {} : { userId: session.userId },
    });

    const accountIds = userAccounts.map((a) => a.id);

    // Ledger transactions involving the user's accounts (or all if admin)
    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: isAdmin
        ? {}
        : {
            OR: [
              { debitAccountId: { in: accountIds } },
              { creditAccountId: { in: accountIds } },
            ],
          },
      include: {
        debitAccount: true,
        creditAccount: true,
        contract: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      accounts: userAccounts,
      entries: ledgerEntries,
    });
  } catch (error) {
    console.error("Fetch ledger error:", error);
    return NextResponse.json({ error: "Failed to fetch ledger transactions" }, { status: 500 });
  }
}

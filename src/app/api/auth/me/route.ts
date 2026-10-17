import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      clientProfile: true,
      freelancerProfile: true,
      ledgerAccounts: true,
    },
  });

  if (!user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  // Parse JSON fields
  let skills: string[] = [];
  if (user.freelancerProfile?.skills) {
    try {
      skills = JSON.parse(user.freelancerProfile.skills);
    } catch {
      skills = [];
    }
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      clientProfile: user.clientProfile,
      freelancerProfile: user.freelancerProfile
        ? {
            ...user.freelancerProfile,
            skills,
          }
        : null,
      ledgerAccounts: user.ledgerAccounts,
    },
  });
}

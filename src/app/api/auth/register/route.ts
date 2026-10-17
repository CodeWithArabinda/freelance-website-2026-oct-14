import { NextRequest, NextResponse } from "next/server";
import { RegisterSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/db";
import { hashPassword, signSession, getSessionCookieConfig } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/auditLogger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = RegisterSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password, fullName, role } = result.data;

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email address already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          fullName,
          role,
        },
      });

      if (role === "CLIENT") {
        await tx.clientProfile.create({
          data: {
            userId: createdUser.id,
            companyName: `${fullName}'s Organization`,
          },
        });
        // Seed initial simulated wallet
        await tx.ledgerAccount.create({
          data: {
            userId: createdUser.id,
            accountType: "CLIENT_AVAILABLE",
            balanceMinor: 1000000, // $10,000.00 test sandbox credit
          },
        });
      } else if (role === "FREELANCER") {
        await tx.freelancerProfile.create({
          data: {
            userId: createdUser.id,
            headline: "Digital Specialist",
            skills: JSON.stringify(["Next.js", "TypeScript", "Tailwind"]),
          },
        });
        await tx.ledgerAccount.create({
          data: {
            userId: createdUser.id,
            accountType: "FREELANCER_AVAILABLE",
            balanceMinor: 0,
          },
        });
      }

      return createdUser;
    });

    const sessionToken = await signSession({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as any,
    });

    await logAuditEvent({
      actorId: user.id,
      action: "USER_REGISTERED",
      entityType: "USER",
      entityId: user.id,
      payload: { role: user.role },
    });

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      },
      { status: 201 }
    );

    const cookieConfig = getSessionCookieConfig(sessionToken);
    response.cookies.set(cookieConfig.name, cookieConfig.value, cookieConfig);

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error occurred during registration" },
      { status: 500 }
    );
  }
}

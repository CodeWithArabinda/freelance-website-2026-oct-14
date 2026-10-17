import { NextRequest, NextResponse } from "next/server";
import { LoginSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/db";
import { verifyPassword, signSession, getSessionCookieConfig } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = LoginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { clientProfile: true, freelancerProfile: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json({ error: "Account has been suspended" }, { status: 403 });
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const sessionToken = await signSession({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as any,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });

    const cookieConfig = getSessionCookieConfig(sessionToken);
    response.cookies.set(cookieConfig.name, cookieConfig.value, cookieConfig);

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error occurred" }, { status: 500 });
  }
}

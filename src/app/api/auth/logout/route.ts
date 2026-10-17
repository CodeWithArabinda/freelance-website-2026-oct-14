import { NextResponse } from "next/server";
import { getLogoutCookieConfig } from "@/lib/auth/session";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  const cookieConfig = getLogoutCookieConfig();
  response.cookies.set(cookieConfig.name, cookieConfig.value, cookieConfig);
  return response;
}

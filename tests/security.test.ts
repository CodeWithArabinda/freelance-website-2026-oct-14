import { describe, it, expect } from "vitest";
import { signSession, verifySession } from "../src/lib/auth/session";
import { RegisterSchema } from "../src/lib/validations/auth";
import { CreateJobSchema, CreateProposalSchema } from "../src/lib/validations/jobs";

describe("Security & Validation Boundaries", () => {
  it("generates a signed JWT session and safely decodes valid tokens", async () => {
    const payload = {
      userId: "usr_123456",
      email: "security@tcc.internal",
      fullName: "Security Auditor",
      role: "ADMIN" as const,
    };

    const token = await signSession(payload);
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);

    const decoded = await verifySession(token);
    expect(decoded).toBeDefined();
    expect(decoded?.userId).toBe(payload.userId);
    expect(decoded?.role).toBe("ADMIN");
  });

  it("strictly rejects tampered session tokens", async () => {
    const token = await signSession({
      userId: "usr_123456",
      email: "security@tcc.internal",
      fullName: "Security Auditor",
      role: "FREELANCER" as const,
    });

    const parts = token.split(".");
    // Tamper with payload
    const tamperedPayload = Buffer.from(
      JSON.stringify({ userId: "usr_123456", role: "ADMIN" })
    ).toString("base64url");
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    const result = await verifySession(tamperedToken);
    expect(result).toBeNull();
  });

  it("validates registration schemas and enforces password strength", () => {
    // Weak password
    const weakResult = RegisterSchema.safeParse({
      email: "test@example.com",
      password: "weak",
      fullName: "John Doe",
      role: "CLIENT",
    });
    expect(weakResult.success).toBe(false);

    // Valid strong password
    const validResult = RegisterSchema.safeParse({
      email: "test@example.com",
      password: "StrongPassword123!",
      fullName: "John Doe",
      role: "CLIENT",
    });
    expect(validResult.success).toBe(true);
  });

  it("enforces integer minor units on job budgets and proposal bids (rejects floating point)", () => {
    // Floating point budget
    const floatBudget = CreateJobSchema.safeParse({
      title: "Build Platform Architecture",
      description: "Comprehensive platform design and implementation",
      category: "Engineering",
      budgetMinor: 100.5, // Invalid float!
      skillsRequired: ["Next.js"],
    });
    expect(floatBudget.success).toBe(false);

    // Negative budget
    const negativeBudget = CreateJobSchema.safeParse({
      title: "Build Platform Architecture",
      description: "Comprehensive platform design and implementation",
      category: "Engineering",
      budgetMinor: -500,
      skillsRequired: ["Next.js"],
    });
    expect(negativeBudget.success).toBe(false);

    // Valid integer minor units (e.g. 50000 = $500.00)
    const validBudget = CreateJobSchema.safeParse({
      title: "Build Platform Architecture",
      description: "Comprehensive platform design and implementation",
      category: "Engineering",
      budgetMinor: 50000,
      skillsRequired: ["Next.js"],
    });
    expect(validResultBudget(validBudget)).toBe(true);

    // Floating point bid
    const floatBid = CreateProposalSchema.safeParse({
      bidAmountMinor: 499.99, // Float!
      coverLetter: "This is a detailed proposal cover letter explaining technical approaches",
      estimatedDays: 5,
    });
    expect(floatBid.success).toBe(false);
  });
});

function validResultBudget(res: any) {
  return res.success;
}

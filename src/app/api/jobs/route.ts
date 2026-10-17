import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { CreateJobSchema } from "@/lib/validations/jobs";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit/auditLogger";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";
    const category = searchParams.get("category");
    const status = searchParams.get("status") || "OPEN";

    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }
    if (category) {
      whereClause.category = category;
    }
    if (query) {
      whereClause.OR = [
        { title: { contains: query } },
        { description: { contains: query } },
        { skillsRequired: { contains: query } },
      ];
    }

    const jobs = await prisma.job.findMany({
      where: whereClause,
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            clientProfile: true,
          },
        },
        _count: {
          select: { proposals: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedJobs = jobs.map((job) => {
      let skills: string[] = [];
      try {
        skills = JSON.parse(job.skillsRequired);
      } catch {
        skills = [];
      }
      return {
        ...job,
        skillsRequired: skills,
        proposalCount: job._count.proposals,
      };
    });

    return NextResponse.json({ jobs: formattedJobs });
  } catch (error) {
    console.error("Fetch jobs error:", error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "CLIENT" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only clients can post jobs" }, { status: 403 });
    }

    const body = await req.json();
    const result = CreateJobSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, description, category, budgetMinor, skillsRequired } = result.data;

    const job = await prisma.job.create({
      data: {
        clientId: session.userId,
        title,
        description,
        category,
        budgetMinor,
        skillsRequired: JSON.stringify(skillsRequired),
        status: "OPEN",
      },
      include: {
        client: {
          select: { id: true, fullName: true, clientProfile: true },
        },
      },
    });

    await logAuditEvent({
      actorId: session.userId,
      action: "JOB_CREATED",
      entityType: "JOB",
      entityId: job.id,
      payload: { title, budgetMinor },
    });

    return NextResponse.json(
      {
        ...job,
        skillsRequired,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create job error:", error);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}

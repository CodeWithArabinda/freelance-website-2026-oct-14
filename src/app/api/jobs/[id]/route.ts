import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    const jobId = params.id;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            clientProfile: true,
          },
        },
        proposals: {
          include: {
            freelancer: {
              select: {
                id: true,
                fullName: true,
                freelancerProfile: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    let skills: string[] = [];
    try {
      skills = JSON.parse(job.skillsRequired);
    } catch {
      skills = [];
    }

    // Only the client owner or admin sees all proposals; other users see either their own proposal or proposal count
    const isOwnerOrAdmin =
      session && (session.userId === job.clientId || session.role === "ADMIN");

    const sanitizedProposals = job.proposals
      .filter((p) => isOwnerOrAdmin || (session && p.freelancerId === session.userId))
      .map((p) => {
        let fSkills: string[] = [];
        if (p.freelancer.freelancerProfile?.skills) {
          try {
            fSkills = JSON.parse(p.freelancer.freelancerProfile.skills);
          } catch {
            fSkills = [];
          }
        }
        return {
          ...p,
          freelancer: {
            ...p.freelancer,
            freelancerProfile: p.freelancer.freelancerProfile
              ? {
                  ...p.freelancer.freelancerProfile,
                  skills: fSkills,
                }
              : null,
          },
        };
      });

    return NextResponse.json({
      job: {
        ...job,
        skillsRequired: skills,
        proposals: sanitizedProposals,
        proposalCount: job.proposals.length,
        isOwner: session ? session.userId === job.clientId : false,
      },
    });
  } catch (error) {
    console.error("Fetch job error:", error);
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}

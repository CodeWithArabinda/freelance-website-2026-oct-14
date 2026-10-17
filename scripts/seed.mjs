import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding TCC Freelance demo data...");

  // Clear existing records cleanly
  await prisma.auditEvent.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.ledgerAccount.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.workSubmission.deleteMany();
  await prisma.escrowRecord.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.review.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.job.deleteMany();
  await prisma.freelancerProfile.deleteMany();
  await prisma.clientProfile.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // 1. Seed Client
  const clientUser = await prisma.user.create({
    data: {
      email: "client@tcc.internal",
      passwordHash,
      fullName: "Marcus Vance",
      role: "CLIENT",
      clientProfile: {
        create: {
          companyName: "Vance Digital Innovations",
          website: "https://vance-innovations.io",
          description: "Enterprise software studio engineering fintech platforms and web infrastructure.",
          totalSpentMinor: 0,
        },
      },
      ledgerAccounts: {
        create: {
          accountType: "CLIENT_AVAILABLE",
          balanceMinor: 2500000, // $25,000.00 simulated sandbox balance
        },
      },
    },
  });

  // 2. Seed Freelancer
  const freelancerUser = await prisma.user.create({
    data: {
      email: "freelancer@tcc.internal",
      passwordHash,
      fullName: "Elena Rostova",
      role: "FREELANCER",
      freelancerProfile: {
        create: {
          headline: "Senior Full-Stack & Systems Architect",
          bio: "Specializing in Next.js, TypeScript, transactional databases, and resilient financial state machines.",
          hourlyRateMinor: 9500, // $95.00/hr
          skills: JSON.stringify(["Next.js", "TypeScript", "Tailwind CSS", "Prisma", "PostgreSQL", "Escrow FSM"]),
          totalEarnedMinor: 0,
        },
      },
      ledgerAccounts: {
        create: {
          accountType: "FREELANCER_AVAILABLE",
          balanceMinor: 0,
        },
      },
    },
  });

  // 3. Seed Platform Holding and Fee Revenue Accounts
  await prisma.ledgerAccount.create({
    data: {
      userId: null,
      accountType: "PLATFORM_ESCROW_HOLDING",
      balanceMinor: 0,
    },
  });

  await prisma.ledgerAccount.create({
    data: {
      userId: null,
      accountType: "PLATFORM_FEE_REVENUE",
      balanceMinor: 0,
    },
  });

  // 4. Seed Admin
  await prisma.user.create({
    data: {
      email: "admin@tcc.internal",
      passwordHash,
      fullName: "Platform Administrator",
      role: "ADMIN",
    },
  });

  // 5. Seed Jobs
  const job1 = await prisma.job.create({
    data: {
      clientId: clientUser.id,
      title: "Build Milestone Escrow Marketplace Engine in Next.js 14",
      description: "We require an audit-grade freelance platform featuring milestone contracts, simulated escrow with double-entry ledgers, and role-based access control.",
      category: "Web & Software Architecture",
      budgetMinor: 150000, // $1,500.00
      status: "OPEN",
      skillsRequired: JSON.stringify(["Next.js", "TypeScript", "Tailwind CSS", "Prisma", "FSM"]),
    },
  });

  const job2 = await prisma.job.create({
    data: {
      clientId: clientUser.id,
      title: "Design System & Accessible Component Library",
      description: "Create a trustworthy, accessible visual UI kit with high contrast ratios, responsive grids, and clean design tokens for a SaaS marketplace.",
      category: "UI/UX & Frontend",
      budgetMinor: 80000, // $800.00
      status: "OPEN",
      skillsRequired: JSON.stringify(["Tailwind CSS", "React", "Figma", "Accessibility"]),
    },
  });

  const job3 = await prisma.job.create({
    data: {
      clientId: clientUser.id,
      title: "Smart Settlement Adapter & Accounting Audit Tools",
      description: "Formulate architecture contracts and boundary layers to adapt simulated ledgers into real payment settlement gateways.",
      category: "Fintech & Security",
      budgetMinor: 300000, // $3,000.00
      status: "OPEN",
      skillsRequired: JSON.stringify(["Fintech", "Ledger Accounting", "Security", "Zod"]),
    },
  });

  // 6. Seed Proposal on Job 1
  const proposal1 = await prisma.proposal.create({
    data: {
      jobId: job1.id,
      freelancerId: freelancerUser.id,
      bidAmountMinor: 140000, // $1,400.00
      coverLetter: "I have designed several escrow and double-entry accounting state machines. I will deliver clean TypeScript contracts, full unit test coverage, and a responsive Next.js marketplace UI.",
      estimatedDays: 10,
      status: "ACCEPTED",
    },
  });

  // 7. Seed Contract from Proposal 1
  const contract1 = await prisma.contract.create({
    data: {
      jobId: job1.id,
      clientId: clientUser.id,
      freelancerId: freelancerUser.id,
      proposalId: proposal1.id,
      title: "Contract: Milestone Escrow Marketplace Engine",
      totalAmountMinor: 140000,
      status: "CREATED",
      milestones: {
        create: [
          {
            title: "Milestone 1: Domain Architecture & Escrow State Machine",
            description: "Complete FSM transitions, Zod validation schemas, and double-entry ledger specifications.",
            amountMinor: 70000,
            orderIndex: 0,
            status: "PENDING",
          },
          {
            title: "Milestone 2: Frontend Marketplace UI & Integration Tests",
            description: "Responsive portal, contract workspaces, and full invariant test suite.",
            amountMinor: 70000,
            orderIndex: 1,
            status: "PENDING",
          },
        ],
      },
    },
  });

  console.log("✅ Seed completed successfully!");
  console.log("Credentials:");
  console.log("  Client:     client@tcc.internal     / Password123!");
  console.log("  Freelancer: freelancer@tcc.internal / Password123!");
  console.log("  Admin:      admin@tcc.internal      / Password123!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

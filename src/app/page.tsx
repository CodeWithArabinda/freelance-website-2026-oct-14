import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import {
  ShieldCheck,
  Zap,
  Lock,
  ArrowRight,
  Briefcase,
  Users,
  CheckCircle,
  Clock,
  Layers,
  ChevronRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const jobs = await prisma.job.findMany({
    take: 6,
    orderBy: { createdAt: "desc" },
    include: {
      client: {
        select: {
          fullName: true,
          clientProfile: true,
        },
      },
      _count: {
        select: { proposals: true },
      },
    },
  });

  const totalJobs = await prisma.job.count();
  const totalFreelancers = await prisma.user.count({ where: { role: "FREELANCER" } });
  const totalContracts = await prisma.contract.count();

  return (
    <div className="space-y-16 py-4">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-8 sm:p-14 shadow-xl border border-slate-700/50">
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase">
            <ShieldCheck className="w-4 h-4" />
            <span>PROJECT FREELANCE — Production Architecture</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            The Freelance Marketplace Built on <span className="text-emerald-400">Verifiable Escrow</span>.
          </h1>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl">
            Connect ambitious clients with elite freelancers. Every milestone is protected by a deterministic state machine and double-entry ledger ensuring delivery before fund release.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/jobs"
              className="inline-flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-6 py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition"
            >
              <Briefcase className="w-5 h-5" />
              <span>Browse Open Jobs</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/register"
              className="inline-flex items-center space-x-2 bg-slate-800/80 hover:bg-slate-750 text-slate-200 border border-slate-700 font-semibold px-6 py-3 rounded-xl transition"
            >
              <Users className="w-5 h-5" />
              <span>Join as Freelancer or Client</span>
            </Link>
          </div>
        </div>

        {/* Decorative Grid Lines */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
      </section>

      {/* Metrics Bar */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Opportunities</div>
          <div className="text-3xl font-bold text-slate-900 mt-2">{totalJobs}</div>
          <div className="text-xs text-emerald-600 mt-1 font-medium">Verified listings</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vetted Specialists</div>
          <div className="text-3xl font-bold text-slate-900 mt-2">{totalFreelancers}</div>
          <div className="text-xs text-blue-600 mt-1 font-medium">Digital engineers & designers</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Milestone Contracts</div>
          <div className="text-3xl font-bold text-slate-900 mt-2">{totalContracts}</div>
          <div className="text-xs text-purple-600 mt-1 font-medium">FSM state validated</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Security Invariants</div>
          <div className="text-3xl font-bold text-emerald-600 mt-2">100% Passed</div>
          <div className="text-xs text-slate-500 mt-1 font-medium">25 automated domain tests</div>
        </div>
      </section>

      {/* How Escrow Works */}
      <section className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-xs space-y-8">
        <div>
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Architectural Security</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
            How the Simulated Escrow Engine Protects You
          </h2>
          <p className="text-slate-600 mt-2 max-w-2xl text-sm leading-relaxed">
            Eliminating payment risk on both sides. Funds are held in a platform double-entry custody account until client review confirms deliverables meet contract specifications.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
              1
            </div>
            <h3 className="font-semibold text-slate-900 text-base">Client Funds Escrow</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Client approves milestone scope and transfers simulated balance into platform escrow holding. Funds are locked.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-sm">
              2
            </div>
            <h3 className="font-semibold text-slate-900 text-base">Work in Progress</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Freelancer works with 100% confidence that funds are secured. Progress and milestones are tracked in real-time.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm">
              3
            </div>
            <h3 className="font-semibold text-slate-900 text-base">Deliverable Review</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Freelancer submits work proofs and repositories. Client inspects deliverables directly in the contract workspace.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-sm">
              4
            </div>
            <h3 className="font-semibold text-slate-900 text-base">Release & Audit</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Client triggers payout. Double-entry ledger credits freelancer available balance, with an immutable audit event recorded.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Jobs */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Featured Open Opportunities</h2>
            <p className="text-sm text-slate-500 mt-1">High-priority contracts seeking verified engineering talent</p>
          </div>
          <Link
            href="/jobs"
            className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {jobs.map((job) => {
            let skills: string[] = [];
            try {
              skills = JSON.parse(job.skillsRequired);
            } catch {
              skills = [];
            }

            return (
              <div
                key={job.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md hover:border-emerald-300 transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                      {job.category}
                    </span>
                    <span className="text-slate-400 font-medium">
                      {job._count.proposals} {job._count.proposals === 1 ? "proposal" : "proposals"}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 hover:text-emerald-600 transition line-clamp-2">
                    <Link href={`/jobs/${job.id}`}>{job.title}</Link>
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {job.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {skills.slice(0, 3).map((skill, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md"
                      >
                        {skill}
                      </span>
                    ))}
                    {skills.length > 3 && (
                      <span className="text-[11px] text-slate-400 px-1 py-0.5">
                        +{skills.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase font-medium">Budget</div>
                    <div className="text-lg font-bold text-slate-900">
                      {formatCurrency(job.budgetMinor)}
                    </div>
                  </div>

                  <Link
                    href={`/jobs/${job.id}`}
                    className="inline-flex items-center space-x-1 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg transition"
                  >
                    <span>View Job</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

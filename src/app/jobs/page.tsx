import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { Briefcase, Search, ArrowRight, Building2, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function JobsPage({
  searchParams,
}: {
  searchParams?: { query?: string; category?: string };
}) {
  const query = searchParams?.query || "";
  const category = searchParams?.category || "";

  const whereClause: any = { status: "OPEN" };
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

  const categories = [
    "All Categories",
    "Web & Software Architecture",
    "UI/UX & Frontend",
    "Fintech & Security",
    "Mobile Development",
  ];

  return (
    <div className="space-y-8">
      {/* Search Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Explore Open Opportunities</h1>
          <p className="text-xs text-slate-500 mt-1">Discover verified freelance projects with guaranteed milestone escrow funding</p>
        </div>

        <form method="GET" className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              name="query"
              defaultValue={query}
              placeholder="Search by keywords, technical stack, or title..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition"
          >
            Search Jobs
          </button>
        </form>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Found {jobs.length} open {jobs.length === 1 ? "position" : "positions"}</span>
        </div>

        {jobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
            <Briefcase className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-semibold text-slate-700 text-sm">No jobs match your search criteria</p>
            <p className="text-xs">Try different keywords or clear category filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
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
                  className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:border-emerald-300 hover:shadow-md transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6"
                >
                  <div className="space-y-3 max-w-3xl">
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md">
                        {job.category}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500 flex items-center space-x-1">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{job.client.clientProfile?.companyName || job.client.fullName}</span>
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-slate-900 hover:text-emerald-600 transition">
                      <Link href={`/jobs/${job.id}`}>{job.title}</Link>
                    </h2>

                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {job.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {skills.map((skill, i) => (
                        <span
                          key={i}
                          className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100">
                    <div className="mb-0 sm:mb-3">
                      <div className="text-[11px] text-slate-400 uppercase font-medium">Budget</div>
                      <div className="text-xl font-extrabold text-slate-900">
                        {formatCurrency(job.budgetMinor)}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {job._count.proposals} proposals
                      </div>
                    </div>

                    <Link
                      href={`/jobs/${job.id}`}
                      className="inline-flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2 rounded-lg transition"
                    >
                      <span>View & Propose</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

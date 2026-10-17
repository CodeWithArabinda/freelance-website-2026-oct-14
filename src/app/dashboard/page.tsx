import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Briefcase,
  DollarSign,
  FileText,
  Clock,
  ArrowRight,
  ShieldAlert,
  Layers,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getCurrentUser();
  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      clientProfile: true,
      freelancerProfile: true,
      ledgerAccounts: true,
      clientContracts: {
        include: {
          freelancer: { select: { fullName: true } },
          milestones: true,
          escrowRecord: true,
        },
        orderBy: { updatedAt: "desc" },
      },
      freelancerContracts: {
        include: {
          client: { select: { fullName: true } },
          milestones: true,
          escrowRecord: true,
        },
        orderBy: { updatedAt: "desc" },
      },
      jobs: {
        include: {
          _count: { select: { proposals: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      proposals: {
        include: {
          job: { select: { id: true, title: true, budgetMinor: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const isClient = user.role === "CLIENT";
  const contracts = isClient ? user.clientContracts : user.freelancerContracts;

  const availableAccount = user.ledgerAccounts.find(
    (a) => a.accountType === (isClient ? "CLIENT_AVAILABLE" : "FREELANCER_AVAILABLE")
  );
  const availableBalance = availableAccount?.balanceMinor ?? 0;

  // Calculate active escrow locked across contracts
  const activeEscrowLocked = contracts
    .filter((c) => c.status === "FUNDED_SIMULATED" || c.status === "IN_PROGRESS" || c.status === "SUBMITTED")
    .reduce((sum, c) => sum + c.totalAmountMinor, 0);

  return (
    <div className="space-y-8">
      {/* Top Welcome Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900">Welcome, {user.fullName}</h1>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                isClient ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {user.role}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {isClient
              ? user.clientProfile?.companyName || "Client Account"
              : user.freelancerProfile?.headline || "Freelance Specialist"}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {isClient ? (
            <Link
              href="/jobs/new"
              className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Job</span>
            </Link>
          ) : (
            <Link
              href="/jobs"
              className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs transition"
            >
              <Briefcase className="w-4 h-4" />
              <span>Browse Open Jobs</span>
            </Link>
          )}

          <Link
            href="/ledger"
            className="inline-flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-xl transition"
          >
            <span>Ledger History</span>
          </Link>
        </div>
      </div>

      {/* Financial Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Available Sandbox Balance</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {formatCurrency(availableBalance)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Test funds for milestone simulated escrow</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Active Escrow in Custody</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 mt-2">
            {formatCurrency(activeEscrowLocked)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Locked awaiting review & approval</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>{isClient ? "Total Released to Date" : "Total Earned to Date"}</span>
            <CheckCircle2 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {formatCurrency(
              isClient
                ? user.clientProfile?.totalSpentMinor ?? 0
                : user.freelancerProfile?.totalEarnedMinor ?? 0
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Audit-verified release transactions</div>
        </div>
      </div>

      {/* Contracts Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Your Milestone Contracts</h2>
            <p className="text-xs text-slate-500">Manage active deliverables, fundings, and escrow releases</p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {contracts.length} {contracts.length === 1 ? "Contract" : "Contracts"}
          </span>
        </div>

        {contracts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            No active contracts found yet. Accept an offer or submit a proposal to establish an escrow engagement.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {contracts.map((contract) => (
              <div key={contract.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-slate-900 text-sm hover:text-emerald-600 transition">
                      <Link href={`/contracts/${contract.id}`}>{contract.title}</Link>
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        contract.status === "RELEASED_SIMULATED"
                          ? "bg-emerald-100 text-emerald-800"
                          : contract.status === "FUNDED_SIMULATED" || contract.status === "IN_PROGRESS"
                          ? "bg-blue-100 text-blue-800"
                          : contract.status === "SUBMITTED"
                          ? "bg-purple-100 text-purple-800"
                          : contract.status === "DISPUTED"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {contract.status.replace("_SIMULATED", "")}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center space-x-3">
                    <span>
                      {isClient
                        ? `Freelancer: ${(contract as any).freelancer?.fullName}`
                        : `Client: ${(contract as any).client?.fullName}`}
                    </span>
                    <span>•</span>
                    <span>Milestones: {contract.milestones.length}</span>
                    <span>•</span>
                    <span>Updated: {formatDate(contract.updatedAt)}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900">
                      {formatCurrency(contract.totalAmountMinor)}
                    </div>
                    <div className="text-[10px] text-slate-400">Total Escrow</div>
                  </div>

                  <Link
                    href={`/contracts/${contract.id}`}
                    className="inline-flex items-center space-x-1 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg transition"
                  >
                    <span>Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Secondary Listings or Proposals */}
      {isClient ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Your Posted Jobs</h2>
            <Link href="/jobs/new" className="text-xs text-emerald-600 font-semibold hover:underline">
              + Post New
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {user.jobs.map((job) => (
              <div key={job.id} className="py-3 flex items-center justify-between">
                <div>
                  <Link href={`/jobs/${job.id}`} className="font-semibold text-slate-900 text-sm hover:text-emerald-600 transition">
                    {job.title}
                  </Link>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Budget: {formatCurrency(job.budgetMinor)} • Proposals: {job._count.proposals}
                  </div>
                </div>
                <Link
                  href={`/jobs/${job.id}`}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1 bg-slate-100 rounded-lg"
                >
                  View Details
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Your Submitted Proposals</h2>
          <div className="divide-y divide-slate-100">
            {user.proposals.map((prop) => (
              <div key={prop.id} className="py-3 flex items-center justify-between">
                <div>
                  <Link href={`/jobs/${prop.job.id}`} className="font-semibold text-slate-900 text-sm hover:text-emerald-600 transition">
                    {prop.job.title}
                  </Link>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Bid: {formatCurrency(prop.bidAmountMinor)} • Status:{" "}
                    <span className="font-semibold text-slate-700">{prop.status}</span>
                  </div>
                </div>
                <Link
                  href={`/jobs/${prop.job.id}`}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1 bg-slate-100 rounded-lg"
                >
                  View Job
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Briefcase,
  Building2,
  DollarSign,
  Clock,
  ArrowRight,
  Send,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
} from "lucide-react";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Proposal form state
  const [bidDollars, setBidDollars] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("7");
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [proposalSuccess, setProposalSuccess] = useState(false);

  // Accept proposal state
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [jobRes, meRes] = await Promise.all([
        fetch(`/api/jobs/${jobId}`),
        fetch("/api/auth/me"),
      ]);

      if (jobRes.ok) {
        const jData = await jobRes.json();
        setJob(jData.job);
        setBidDollars((jData.job.budgetMinor / 100).toString());
      } else {
        setError("Job not found");
      }

      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData.user);
      }
    } catch {
      setError("Failed to load job details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [jobId]);

  const handleProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingProposal(true);
    setError("");

    const bidNumber = parseFloat(bidDollars);
    if (isNaN(bidNumber) || bidNumber <= 0) {
      setError("Please provide a valid bid amount");
      setSubmittingProposal(false);
      return;
    }

    const bidAmountMinor = Math.round(bidNumber * 100);
    const estDays = parseInt(estimatedDays, 10);

    try {
      const res = await fetch(`/api/jobs/${jobId}/proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bidAmountMinor,
          coverLetter,
          estimatedDays: estDays,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit proposal");
      } else {
        setProposalSuccess(true);
        await fetchData();
      }
    } catch {
      setError("Network error submitting proposal");
    } finally {
      setSubmittingProposal(false);
    }
  };

  const handleAcceptProposal = async (proposalId: string) => {
    setAcceptingId(proposalId);
    setError("");

    try {
      const res = await fetch(`/api/proposals/${proposalId}/accept`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to accept proposal");
      } else {
        router.push(`/contracts/${data.contract.id}`);
      }
    } catch {
      setError("Network error accepting proposal");
    } finally {
      setAcceptingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-500 text-xs animate-pulse">
        Loading job specifications and proposals...
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
          {error}
        </div>
        <Link href="/jobs" className="text-xs text-emerald-600 font-semibold hover:underline">
          &larr; Back to job listings
        </Link>
      </div>
    );
  }

  const isOwner = currentUser?.id === job.clientId;
  const isFreelancer = currentUser?.role === "FREELANCER";
  const userProposal = job.proposals?.find((p: any) => p.freelancerId === currentUser?.id);

  return (
    <div className="space-y-8">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md">
              {job.category}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500 flex items-center space-x-1">
              <Building2 className="w-3.5 h-3.5" />
              <span>{job.client.clientProfile?.companyName || job.client.fullName}</span>
            </span>
          </div>

          <span
            className={`font-bold px-2 py-0.5 rounded-full uppercase text-[10px] ${
              job.status === "OPEN" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
            }`}
          >
            {job.status}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{job.title}</h1>

        <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600 pt-2 border-t border-slate-100">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-medium">Estimated Budget</span>
            <strong className="text-base text-slate-900">{formatCurrency(job.budgetMinor)}</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-medium">Proposals Received</span>
            <strong className="text-base text-slate-900">{job.proposalCount}</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-medium">Date Posted</span>
            <strong className="text-slate-700">{formatDate(job.createdAt)}</strong>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
          {error}
        </div>
      )}

      {/* Main Grid: Job Description + Skills & Client Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">Project Description & Deliverables</h2>
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {job.description}
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Required Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {job.skillsRequired.map((skill: string, i: number) => (
                  <span
                    key={i}
                    className="text-xs font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Proposals Section for Client Owner */}
          {isOwner && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Candidate Proposals</h2>
                  <p className="text-xs text-slate-500">
                    Select a specialist to establish a milestone contract and fund simulated escrow
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  {job.proposals.length} Submitted
                </span>
              </div>

              {job.proposals.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  No proposals submitted for this listing yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {job.proposals.map((prop: any) => (
                    <div key={prop.id} className="py-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">
                            {prop.freelancer.fullName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {prop.freelancer.freelancerProfile?.headline || "Freelancer Specialist"}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-bold text-slate-900">
                            {formatCurrency(prop.bidAmountMinor)}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Est. {prop.estimatedDays} days
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 leading-relaxed">
                        {prop.coverLetter}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            prop.status === "ACCEPTED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          Status: {prop.status}
                        </span>

                        {prop.status === "PENDING" && (
                          <button
                            onClick={() => handleAcceptProposal(prop.id)}
                            disabled={acceptingId === prop.id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-xs flex items-center space-x-1.5 disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              {acceptingId === prop.id ? "Accepting..." : "Accept Offer & Establish Escrow"}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar / Freelancer Actions */}
        <div className="space-y-6">
          {/* Client Information Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 text-sm">About the Client</h3>
            <div className="space-y-1.5 text-slate-600">
              <div className="font-semibold text-slate-900">{job.client.fullName}</div>
              {job.client.clientProfile?.companyName && (
                <div className="text-slate-500">{job.client.clientProfile.companyName}</div>
              )}
              {job.client.clientProfile?.website && (
                <a
                  href={job.client.clientProfile.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-600 hover:underline block"
                >
                  {job.client.clientProfile.website}
                </a>
              )}
            </div>
          </div>

          {/* Proposal Action for Freelancer */}
          {isFreelancer && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Submit Your Proposal</h3>

              {userProposal ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs space-y-2">
                  <div className="font-bold flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Proposal Submitted</span>
                  </div>
                  <p>
                    Your bid: <strong>{formatCurrency(userProposal.bidAmountMinor)}</strong>. Status:{" "}
                    <strong>{userProposal.status}</strong>.
                  </p>
                </div>
              ) : job.status !== "OPEN" ? (
                <div className="p-4 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs">
                  This job is currently in selection or awarded and is no longer accepting new proposals.
                </div>
              ) : (
                <form onSubmit={handleProposalSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Your Bid Amount (USD)
                    </label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="number"
                        step="1"
                        min="5"
                        required
                        value={bidDollars}
                        onChange={(e) => setBidDollars(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Estimated Duration (Days)
                    </label>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="number"
                        min="1"
                        max="365"
                        required
                        value={estimatedDays}
                        onChange={(e) => setEstimatedDays(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cover Letter & Approach
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      placeholder="Outline your architecture approach, relevant past experience, and deliverable commitments..."
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingProposal}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg text-xs transition shadow-sm flex items-center justify-center space-x-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submittingProposal ? "Submitting..." : "Send Proposal Offer"}</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {!currentUser && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs text-center space-y-3">
              <p className="text-xs text-slate-600">Sign in to propose on this project</p>
              <Link
                href="/login"
                className="block w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 rounded-lg text-xs transition"
              >
                Sign In to Apply
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

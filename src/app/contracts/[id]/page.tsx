"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertTriangle,
  FileCheck,
  Send,
  Lock,
  Layers,
  DollarSign,
  Building,
  User,
  ExternalLink,
} from "lucide-react";

export default function ContractWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const contractId = params.id as string;

  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Submissions form
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("https://github.com/project/deliverables");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dispute form
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [isDisputing, setIsDisputing] = useState(false);

  // Action loading states
  const [actionLoading, setActionLoading] = useState(false);

  const fetchContract = async () => {
    try {
      const res = await fetch(`/api/contracts/${contractId}`);
      if (res.ok) {
        const data = await res.json();
        setContract(data.contract);
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to load contract");
      }
    } catch {
      setError("Network error loading contract workspace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContract();
  }, [contractId]);

  const handleFundEscrow = async () => {
    setActionLoading(true);
    setError("");
    setActionSuccess("");

    try {
      const res = await fetch(`/api/contracts/${contractId}/fund`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to fund escrow");
      } else {
        setActionSuccess("Simulated escrow funded! Funds are safely held in platform custody.");
        await fetchContract();
      }
    } catch {
      setError("Network error funding escrow");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setActionSuccess("");

    try {
      const res = await fetch(`/api/contracts/${contractId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: submissionNotes,
          attachmentUrls: attachmentUrl ? [attachmentUrl] : [],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit work");
      } else {
        setActionSuccess("Deliverables submitted successfully for client inspection!");
        setSubmissionNotes("");
        await fetchContract();
      }
    } catch {
      setError("Network error submitting work");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveAndRelease = async () => {
    if (!confirm("Are you sure you want to approve this work and release escrow funds to the freelancer?")) {
      return;
    }

    setActionLoading(true);
    setError("");
    setActionSuccess("");

    try {
      const res = await fetch(`/api/contracts/${contractId}/approve`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to approve and release contract");
      } else {
        setActionSuccess("Contract approved and simulated escrow released to freelancer!");
        await fetchContract();
      }
    } catch {
      setError("Network error releasing escrow");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDisputing(true);
    setError("");

    try {
      const res = await fetch(`/api/contracts/${contractId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: disputeReason }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to file dispute");
      } else {
        setShowDisputeModal(false);
        setActionSuccess("Dispute filed. Platform administrators will arbitrate this case.");
        await fetchContract();
      }
    } catch {
      setError("Network error filing dispute");
    } finally {
      setIsDisputing(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-500 text-xs animate-pulse">
        Loading contract workspace and ledger audit records...
      </div>
    );
  }

  if (error && !contract) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
          {error}
        </div>
        <Link href="/dashboard" className="text-xs text-emerald-600 font-semibold hover:underline">
          &larr; Back to dashboard
        </Link>
      </div>
    );
  }

  const { isClient, isFreelancer, isAdmin } = contract;
  const isDisputed = contract.status === "DISPUTED";
  const isReleased = contract.status === "RELEASED_SIMULATED";
  const isRefunded = contract.status === "REFUNDED_SIMULATED";

  const workflowSteps = [
    { key: "CREATED", label: "Contract Created" },
    { key: "FUNDED_SIMULATED", label: "Escrow Funded" },
    { key: "SUBMITTED", label: "Work Submitted" },
    { key: "RELEASED_SIMULATED", label: "Funds Released" },
  ];

  const getStepStatus = (stepKey: string) => {
    const order = ["CREATED", "FUNDED_SIMULATED", "IN_PROGRESS", "SUBMITTED", "APPROVED", "RELEASED_SIMULATED"];
    const currentIndex = order.indexOf(contract.status);
    const targetIndex = order.indexOf(stepKey);

    if (isDisputed) return "disputed";
    if (isRefunded) return "refunded";
    if (currentIndex >= targetIndex) return "completed";
    return "pending";
  };

  return (
    <div className="space-y-8">
      {/* Workspace Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-400">Contract #{contract.id.slice(0, 8)}</span>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                  isReleased
                    ? "bg-emerald-100 text-emerald-800"
                    : isDisputed
                    ? "bg-rose-100 text-rose-800"
                    : isRefunded
                    ? "bg-amber-100 text-amber-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {contract.status.replace("_SIMULATED", "")}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{contract.title}</h1>
            <div className="text-xs text-slate-500 flex items-center space-x-4">
              <span>Client: <strong>{contract.client.fullName}</strong></span>
              <span>•</span>
              <span>Freelancer: <strong>{contract.freelancer.fullName}</strong></span>
            </div>
          </div>

          <div className="sm:text-right bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              Total Contract Escrow
            </div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {formatCurrency(contract.totalAmountMinor)}
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-0.5 flex items-center sm:justify-end space-x-1">
              <Lock className="w-3 h-3" />
              <span>Simulated Protection</span>
            </div>
          </div>
        </div>

        {/* Visual Escrow Workflow Stepper */}
        <div className="pt-4 border-t border-slate-100">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {workflowSteps.map((step, idx) => {
              const status = getStepStatus(step.key);
              return (
                <div
                  key={step.key}
                  className={`p-3 rounded-xl border text-xs transition ${
                    status === "completed"
                      ? "border-emerald-300 bg-emerald-50/50 text-emerald-950 font-semibold"
                      : status === "disputed"
                      ? "border-rose-200 bg-rose-50/50 text-rose-900"
                      : "border-slate-200 bg-slate-50/50 text-slate-400"
                  }`}
                >
                  <div className="flex items-center space-x-1.5 mb-1">
                    {status === "completed" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : status === "disputed" ? (
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-300" />
                    )}
                    <span className="text-[10px] uppercase font-bold text-slate-400">Step {idx + 1}</span>
                  </div>
                  <div>{step.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Action Banners & Controls */}
      {isDisputed ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-3">
          <div className="flex items-center space-x-2 text-sm font-bold text-rose-950">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span>Formal Dispute Active</span>
          </div>
          <p className="leading-relaxed">
            This contract is under administrative arbitration. Ordinary client release has been frozen until resolution.
          </p>
          <div className="p-3 bg-white/80 rounded-xl border border-rose-200 text-rose-950 font-medium">
            <strong>Reason filed:</strong> {contract.dispute?.reason}
          </div>
          {isAdmin && (
            <Link
              href="/admin/disputes"
              className="inline-block bg-rose-900 text-white font-semibold px-4 py-2 rounded-lg text-xs hover:bg-rose-950 transition"
            >
              Arbitrate in Admin Console &rarr;
            </Link>
          )}
        </div>
      ) : isReleased ? (
        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-950 space-y-2">
          <div className="flex items-center space-x-2 text-sm font-bold text-emerald-900">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Escrow Successfully Released</span>
          </div>
          <p className="leading-relaxed">
            The client has approved all deliverables and {formatCurrency(contract.totalAmountMinor)} was transferred to the freelancer&apos;s available sandbox balance.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900">Required Next Action</h2>

          {/* Client Action: Fund Escrow */}
          {isClient && contract.status === "CREATED" && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
              <div className="text-xs text-blue-900 leading-relaxed">
                <strong>Simulate Escrow Deposit:</strong> Fund {formatCurrency(contract.totalAmountMinor)} into platform custody. Funds are locked safely until you inspect the delivered work.
              </div>
              <button
                onClick={handleFundEscrow}
                disabled={actionLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition shadow-xs flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{actionLoading ? "Processing..." : "Deposit & Lock Escrow Funds"}</span>
              </button>
            </div>
          )}

          {/* Freelancer Action: Submit Work */}
          {isFreelancer && (contract.status === "FUNDED_SIMULATED" || contract.status === "IN_PROGRESS") && (
            <form onSubmit={handleSubmitWork} className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-700 font-semibold">
                Submit Your Completed Deliverables for Client Review:
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Deliverable Notes</label>
                <textarea
                  rows={4}
                  required
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  placeholder="Detail what was built, testing verification, and access instructions..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Deliverable Attachment / Repository URL
                </label>
                <input
                  type="url"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  placeholder="https://github.com/my-repo"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition shadow-xs flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Submitting..." : "Submit Deliverables for Review"}</span>
              </button>
            </form>
          )}

          {/* Client Action: Approve & Release */}
          {isClient && contract.status === "SUBMITTED" && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
              <div className="text-xs text-emerald-900 leading-relaxed">
                <strong>Deliverables Awaiting Your Approval:</strong> The freelancer has delivered their work. Please review the submissions below. When satisfied, authorize release of the escrow funds.
              </div>
              <button
                onClick={handleApproveAndRelease}
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition shadow-xs flex items-center space-x-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{actionLoading ? "Releasing..." : "Approve Work & Release Escrow Funds"}</span>
              </button>
            </div>
          )}

          {/* Dispute Button */}
          {!isReleased && !isRefunded && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowDisputeModal(true)}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold hover:underline flex items-center space-x-1"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>File a Formal Dispute</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Grid: Milestones & Submissions + Ledger Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Milestones & Submissions */}
        <div className="space-y-6">
          {/* Milestones Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Contract Milestones</h3>
            <div className="space-y-3">
              {contract.milestones.map((m: any, idx: number) => (
                <div key={m.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-900">
                      Milestone {idx + 1}: {m.title}
                    </span>
                    <span className="font-bold text-xs text-slate-900">
                      {formatCurrency(m.amountMinor)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{m.description}</p>
                  <div className="text-[10px] text-slate-400 font-medium uppercase">
                    Status: <span className="font-bold text-slate-700">{m.status.replace("_SIMULATED", "")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deliverables History */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Submitted Work History</h3>
            {contract.submissions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                No deliverables submitted yet.
              </div>
            ) : (
              <div className="space-y-3">
                {contract.submissions.map((sub: any) => (
                  <div key={sub.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>Submitted by {contract.freelancer.fullName}</span>
                      <span>{formatDate(sub.submittedAt)}</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed font-medium">{sub.notes}</p>
                    {sub.attachmentUrls?.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-2">
                        {sub.attachmentUrls.map((url: string, i: number) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center space-x-1 text-emerald-600 hover:underline font-semibold"
                          >
                            <span>Deliverable Link {i + 1}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Double-Entry Ledger Audit Trail */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Double-Entry Ledger Audit Trail</h3>
            <p className="text-xs text-slate-500">Immutable transaction logs verifying simulated escrow movements</p>
          </div>

          {contract.ledgerEntries.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              No ledger entries recorded for this contract yet. Escrow funding will initiate the first record.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {contract.ledgerEntries.map((entry: any) => (
                <div key={entry.id} className="py-3 text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        entry.referenceType === "ESCROW_LOCK"
                          ? "bg-blue-100 text-blue-800"
                          : entry.referenceType === "ESCROW_RELEASE"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {entry.referenceType}
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(entry.amountMinor)}
                    </span>
                  </div>
                  <div className="text-slate-600">{entry.description}</div>
                  <div className="text-[10px] text-slate-400">{formatDate(entry.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <span>File Formal Contract Dispute</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Filing a dispute halts automated releases and transfers arbitration authority to platform operators. Please specify the issue clearly:
            </p>

            <form onSubmit={handleFileDispute} className="space-y-4">
              <textarea
                rows={4}
                required
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Describe the discrepancy, missed milestone requirements, or breach of deliverables..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
              />

              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDisputing}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition disabled:opacity-50"
                >
                  {isDisputing ? "Submitting..." : "Confirm & File Dispute"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

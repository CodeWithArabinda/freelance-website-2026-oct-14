"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  ExternalLink,
  User,
  Building,
} from "lucide-react";

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionType, setResolutionType] = useState<"RELEASE_TO_FREELANCER" | "REFUND_TO_CLIENT">("RELEASE_TO_FREELANCER");
  const [resolutionNotes, setResolutionNotes] = useState("");

  const fetchDisputes = async () => {
    try {
      const res = await fetch("/api/admin/disputes");
      if (res.ok) {
        const data = await res.json();
        setDisputes(data.disputes);
      } else {
        setError("Unauthorized: Admin credentials required to access arbitration console");
      }
    } catch {
      setError("Network error fetching dispute records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const handleResolve = async (disputeId: string) => {
    if (!resolutionNotes.trim()) {
      alert("Please provide formal arbitration resolution notes");
      return;
    }

    setResolvingId(disputeId);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution: resolutionType,
          resolutionNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to resolve dispute");
      } else {
        setSuccess(`Dispute successfully arbitrated: ${resolutionType}`);
        setResolutionNotes("");
        setResolvingId(null);
        await fetchDisputes();
      }
    } catch {
      setError("Network error resolving dispute");
    } finally {
      setResolvingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-500 text-xs animate-pulse">
        Loading dispute arbitration records...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
          {error}
        </div>
        <p className="text-xs text-slate-500">
          Tip: Use the Demo Switcher in the top navigation bar to switch to the <strong>Admin</strong> role.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-3">
        <div className="flex items-center space-x-2 text-xs font-semibold text-rose-600 uppercase tracking-wider">
          <AlertTriangle className="w-4 h-4" />
          <span>Administrative Arbitration Console</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Contract Dispute Resolution</h1>
        <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
          Platform administrators have authority to inspect deliverables, assess breach claims, and execute either an escrow release to the freelancer or a refund to the client.
        </p>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Disputes List */}
      <div className="space-y-4">
        {disputes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
            <p className="font-semibold text-slate-700 text-sm">No Active Disputes</p>
            <p className="text-xs">All platform contracts are currently operating without arbitration flags.</p>
          </div>
        ) : (
          disputes.map((dispute) => {
            const isOpen = dispute.status === "OPEN";

            return (
              <div
                key={dispute.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="font-semibold text-slate-400">Dispute #{dispute.id.slice(0, 8)}</span>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          isOpen
                            ? "bg-rose-100 text-rose-800"
                            : dispute.status === "RESOLVED_RELEASE"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {dispute.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-slate-900 mt-1">
                      <Link
                        href={`/contracts/${dispute.contract.id}`}
                        className="hover:text-emerald-600 transition flex items-center space-x-1.5"
                      >
                        <span>{dispute.contract.title}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </h2>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900">
                      {formatCurrency(dispute.contract.totalAmountMinor)}
                    </div>
                    <div className="text-[10px] text-slate-400">Escrow Value</div>
                  </div>
                </div>

                {/* Parties and Reason */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-slate-400 uppercase text-[10px] font-bold">Dispute Initiator</span>
                    <div className="font-semibold text-slate-900">{dispute.initiator.fullName} ({dispute.initiator.role})</div>
                    <div className="text-slate-500">{dispute.initiator.email}</div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-slate-400 uppercase text-[10px] font-bold">Contract Parties</span>
                    <div>Client: <strong>{dispute.contract.client.fullName}</strong></div>
                    <div>Freelancer: <strong>{dispute.contract.freelancer.fullName}</strong></div>
                  </div>
                </div>

                <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-100 text-xs text-rose-950 space-y-1">
                  <span className="text-rose-700 font-bold uppercase text-[10px]">Claimed Reason:</span>
                  <p className="leading-relaxed">{dispute.reason}</p>
                </div>

                {/* Resolution Details or Action Controls */}
                {!isOpen ? (
                  <div className="p-4 bg-slate-50 rounded-xl text-xs space-y-1">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Resolution Notes</span>
                    <p className="text-slate-700 font-medium">{dispute.resolutionNotes}</p>
                    <div className="text-[10px] text-slate-400 pt-1">
                      Arbitrated on {formatDate(dispute.resolvedAt)}
                    </div>
                  </div>
                ) : (
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Execute Administrative Arbitration Verdict
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setResolutionType("RELEASE_TO_FREELANCER")}
                        className={`p-3 rounded-xl border text-left text-xs transition ${
                          resolutionType === "RELEASE_TO_FREELANCER"
                            ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 mb-1 text-emerald-600" />
                        <div>Release to Freelancer</div>
                        <div className="text-[10px] font-normal text-slate-500">
                          Work was satisfactorily delivered
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setResolutionType("REFUND_TO_CLIENT")}
                        className={`p-3 rounded-xl border text-left text-xs transition ${
                          resolutionType === "REFUND_TO_CLIENT"
                            ? "border-amber-600 bg-amber-50 text-amber-950 font-bold"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        <RotateCcw className="w-4 h-4 mb-1 text-amber-600" />
                        <div>Refund to Client</div>
                        <div className="text-[10px] font-normal text-slate-500">
                          Milestone breach or non-delivery
                        </div>
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Arbitration Findings & Resolution Notes
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="State legal/contractual findings that support this decision..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                      />
                    </div>

                    <button
                      onClick={() => handleResolve(dispute.id)}
                      disabled={resolvingId === dispute.id}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition shadow-xs disabled:opacity-50"
                    >
                      {resolvingId === dispute.id ? "Executing..." : "Submit Verdict & Update Ledger"}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

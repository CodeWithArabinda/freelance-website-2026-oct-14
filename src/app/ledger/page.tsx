"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  DollarSign,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileText,
  AlertCircle,
} from "lucide-react";

export default function LedgerPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLedger = async () => {
    try {
      const res = await fetch("/api/ledger");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError("Failed to fetch ledger activity");
      }
    } catch {
      setError("Network error fetching ledger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-500 text-xs animate-pulse">
        Loading double-entry ledger journals and account balances...
      </div>
    );
  }

  if (error) {
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-3">
        <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>Double-Entry Escrow Ledger</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Immutable Accounting Journals</h1>
        <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
          Every escrow funding, release, or refund operation produces balanced double-entry accounting records. Financial amounts are recorded strictly in integer minor units (cents) to prevent rounding distortion.
        </p>
      </div>

      {/* Account Balances Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {data?.accounts?.map((acc: any) => (
          <div key={acc.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {acc.accountType.replace(/_/g, " ")}
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              {formatCurrency(acc.balanceMinor)}
            </div>
            <div className="text-[10px] text-slate-400">
              Updated: {formatDate(acc.updatedAt)}
            </div>
          </div>
        ))}
      </div>

      {/* Journal Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Recent Accounting Entries</h2>
          <span className="text-xs text-slate-400 font-semibold">
            {data?.entries?.length ?? 0} Transactions
          </span>
        </div>

        {(!data?.entries || data.entries.length === 0) ? (
          <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            No ledger journal entries recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold text-[10px]">
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Contract / Reference</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.entries.map((entry: any) => (
                  <tr key={entry.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 text-slate-500 whitespace-nowrap">
                      {formatDate(entry.createdAt)}
                    </td>
                    <td className="py-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          entry.referenceType === "ESCROW_LOCK"
                            ? "bg-blue-100 text-blue-800"
                            : entry.referenceType === "ESCROW_RELEASE"
                            ? "bg-emerald-100 text-emerald-800"
                            : entry.referenceType === "ESCROW_REFUND"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {entry.referenceType.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 font-medium text-slate-800">
                      {entry.contract ? (
                        <Link
                          href={`/contracts/${entry.contract.id}`}
                          className="hover:text-emerald-600 transition"
                        >
                          {entry.contract.title}
                        </Link>
                      ) : (
                        "Sandbox System"
                      )}
                    </td>
                    <td className="py-3 text-slate-600 max-w-xs truncate">
                      {entry.description}
                    </td>
                    <td className="py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(entry.amountMinor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

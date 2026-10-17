import Link from "next/link";
import { Shield, Lock, FileCode, CheckCircle2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto bg-slate-900 text-slate-400 text-xs border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2 text-white font-bold text-base mb-3">
              <span className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center text-xs">T</span>
              <span>TCC Freelance</span>
            </div>
            <p className="text-slate-400 max-w-md leading-relaxed">
              An enterprise-grade marketplace connecting visionary clients with top-tier digital specialists. Featuring server-enforced milestone contracts and an auditable simulated double-entry escrow engine.
            </p>
            <div className="mt-4 p-3 bg-slate-800/80 rounded-lg border border-slate-700 max-w-md text-[11px] text-amber-300 flex items-start space-x-2">
              <Shield className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Simulated Testing Sandbox:</strong> All escrow funds, transactions, and balances shown in this system are purely simulated test data. No real monetary transactions or cryptocurrency settlements are conducted.
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Platform Navigation</h4>
            <ul className="space-y-2">
              <li><Link href="/jobs" className="hover:text-emerald-400 transition">Explore Jobs</Link></li>
              <li><Link href="/dashboard" className="hover:text-emerald-400 transition">Client & Freelancer Dashboard</Link></li>
              <li><Link href="/ledger" className="hover:text-emerald-400 transition">Ledger Audit History</Link></li>
              <li><Link href="/admin/disputes" className="hover:text-emerald-400 transition">Dispute Arbitration</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Architecture Guarantees</h4>
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-center space-x-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /><span>Finite State Escrow Machine</span></li>
              <li className="flex items-center space-x-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /><span>Exact Integer Minor Units</span></li>
              <li className="flex items-center space-x-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /><span>Double-Entry Balance Audits</span></li>
              <li className="flex items-center space-x-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /><span>Server-Side Role Invariants</span></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-slate-500 text-[11px]">
          <div>&copy; {new Date().getFullYear()} TCC Freelance (PROJECT FREELANCE). All rights reserved.</div>
          <div className="mt-2 sm:mt-0">Built with Next.js 14 App Router, TypeScript, and Prisma ORM.</div>
        </div>
      </div>
    </footer>
  );
}

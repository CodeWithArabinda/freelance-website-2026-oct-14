"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, ArrowRight, ShieldCheck, UserCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to sign in");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fillQuickDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Password123!");
    setError("");
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">Sign in to TCC Freelance</h1>
        <p className="text-sm text-slate-500">Access your milestone workspace and escrow transactions</p>
      </div>

      {/* Demo Credentials Quick-Fill Card */}
      <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 text-xs space-y-3">
        <div className="flex items-center space-x-1.5 font-bold text-emerald-900">
          <UserCheck className="w-4 h-4 text-emerald-700" />
          <span>Quick 1-Click Demo Accounts</span>
        </div>
        <p className="text-emerald-800">
          Select any seeded role below to auto-fill credentials:
        </p>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => fillQuickDemo("client@tcc.internal")}
            className="p-2 bg-white rounded-lg border border-emerald-300 font-semibold text-emerald-900 hover:bg-emerald-100/50 transition text-center"
          >
            <div>Client</div>
            <div className="text-[10px] text-slate-400 font-normal">Marcus Vance</div>
          </button>
          <button
            type="button"
            onClick={() => fillQuickDemo("freelancer@tcc.internal")}
            className="p-2 bg-white rounded-lg border border-emerald-300 font-semibold text-emerald-900 hover:bg-emerald-100/50 transition text-center"
          >
            <div>Freelancer</div>
            <div className="text-[10px] text-slate-400 font-normal">Elena Rostova</div>
          </button>
          <button
            type="button"
            onClick={() => fillQuickDemo("admin@tcc.internal")}
            className="p-2 bg-white rounded-lg border border-emerald-300 font-semibold text-emerald-900 hover:bg-emerald-100/50 transition text-center"
          >
            <div>Admin</div>
            <div className="text-[10px] text-slate-400 font-normal">Platform Ops</div>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-lg text-sm transition shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          {loading ? (
            <span>Signing in...</span>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="text-center text-xs text-slate-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-emerald-600 font-semibold hover:underline">
          Create account
        </Link>
      </div>
    </div>
  );
}

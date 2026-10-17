"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, User, Briefcase, Building, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"CLIENT" | "FREELANCER">("FREELANCER");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
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

  return (
    <div className="max-w-md mx-auto py-12 px-4 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">Create an Account</h1>
        <p className="text-sm text-slate-500">Join the milestone escrow freelance network</p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Role Toggle */}
        <div className="grid grid-cols-2 gap-3 mb-2">
          <button
            type="button"
            onClick={() => setRole("FREELANCER")}
            className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
              role === "FREELANCER"
                ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold"
                : "border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            <Briefcase className={`w-5 h-5 mb-2 ${role === "FREELANCER" ? "text-emerald-600" : "text-slate-400"}`} />
            <div className="text-xs font-semibold">I&apos;m a Freelancer</div>
            <div className="text-[10px] text-slate-500 font-normal">Offer specialized skills</div>
          </button>

          <button
            type="button"
            onClick={() => setRole("CLIENT")}
            className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
              role === "CLIENT"
                ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold"
                : "border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            <Building className={`w-5 h-5 mb-2 ${role === "CLIENT" ? "text-emerald-600" : "text-slate-400"}`} />
            <div className="text-xs font-semibold">I&apos;m a Client</div>
            <div className="text-[10px] text-slate-500 font-normal">Hire talent & fund milestones</div>
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Alice Vance"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alice@example.com"
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
              placeholder="At least 8 chars, 1 uppercase, 1 number"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Must contain at least 8 characters, 1 uppercase, and 1 number.</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg text-sm transition shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          {loading ? (
            <span>Creating account...</span>
          ) : (
            <>
              <span>Register & Continue</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="text-center text-xs text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="text-emerald-600 font-semibold hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}

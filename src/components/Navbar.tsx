"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import {
  Briefcase,
  ShieldCheck,
  FileText,
  DollarSign,
  User,
  LogOut,
  ChevronDown,
  AlertTriangle,
  PlusCircle,
} from "lucide-react";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setCurrentUser(null);
    router.push("/login");
  };

  const handleQuickLogin = async (email: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "Password123!" }),
      });
      if (res.ok) {
        await fetchUser();
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const primaryBalance = currentUser?.ledgerAccounts?.find(
    (a: any) =>
      a.accountType === "CLIENT_AVAILABLE" || a.accountType === "FREELANCER_AVAILABLE"
  )?.balanceMinor ?? 0;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand */}
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              T
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">TCC Freelance</span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Simulated Escrow
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 text-sm font-medium text-slate-600">
            <Link
              href="/jobs"
              className={`px-3 py-2 rounded-md transition hover:text-emerald-600 hover:bg-slate-50 ${
                pathname === "/jobs" ? "text-emerald-600 font-semibold bg-emerald-50" : ""
              }`}
            >
              Explore Jobs
            </Link>

            {currentUser && (
              <>
                <Link
                  href="/dashboard"
                  className={`px-3 py-2 rounded-md transition hover:text-emerald-600 hover:bg-slate-50 ${
                    pathname === "/dashboard" ? "text-emerald-600 font-semibold bg-emerald-50" : ""
                  }`}
                >
                  Dashboard
                </Link>

                <Link
                  href="/ledger"
                  className={`px-3 py-2 rounded-md transition hover:text-emerald-600 hover:bg-slate-50 ${
                    pathname === "/ledger" ? "text-emerald-600 font-semibold bg-emerald-50" : ""
                  }`}
                >
                  Ledger History
                </Link>

                {currentUser.role === "ADMIN" && (
                  <Link
                    href="/admin/disputes"
                    className={`px-3 py-2 rounded-md transition text-amber-700 hover:bg-amber-50 ${
                      pathname.startsWith("/admin") ? "font-semibold bg-amber-50" : ""
                    }`}
                  >
                    Dispute Arbitration
                  </Link>
                )}
              </>
            )}
          </nav>
        </div>

        {/* Right: Actions / Auth */}
        <div className="flex items-center space-x-3">
          {currentUser?.role === "CLIENT" && (
            <Link
              href="/jobs/new"
              className="hidden sm:inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Post a Job</span>
            </Link>
          )}

          {/* Quick Demo Switcher */}
          <div className="hidden lg:flex items-center space-x-1 bg-slate-100 p-1 rounded-lg text-xs">
            <span className="text-slate-500 px-2 font-medium">Demo Switch:</span>
            <button
              onClick={() => handleQuickLogin("client@tcc.internal")}
              className={`px-2 py-1 rounded transition ${
                currentUser?.role === "CLIENT"
                  ? "bg-white text-emerald-700 font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Client
            </button>
            <button
              onClick={() => handleQuickLogin("freelancer@tcc.internal")}
              className={`px-2 py-1 rounded transition ${
                currentUser?.role === "FREELANCER"
                  ? "bg-white text-emerald-700 font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Freelancer
            </button>
            <button
              onClick={() => handleQuickLogin("admin@tcc.internal")}
              className={`px-2 py-1 rounded transition ${
                currentUser?.role === "ADMIN"
                  ? "bg-white text-emerald-700 font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Admin
            </button>
          </div>

          {isLoading ? (
            <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
          ) : currentUser ? (
            <div className="flex items-center space-x-2">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-slate-900 flex items-center justify-end space-x-1">
                  <span>{currentUser.fullName}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                      currentUser.role === "CLIENT"
                        ? "bg-blue-100 text-blue-800"
                        : currentUser.role === "FREELANCER"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-purple-100 text-purple-800"
                    }`}
                  >
                    {currentUser.role}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Simulated: <strong className="text-emerald-700">{formatCurrency(primaryBalance)}</strong>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Log out"
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                href="/login"
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg transition"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg shadow-sm transition"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

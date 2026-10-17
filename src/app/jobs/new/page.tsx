"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, DollarSign, ArrowRight, Layers } from "lucide-react";

export default function NewJobPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Web & Software Architecture");
  const [description, setDescription] = useState("");
  const [budgetDollars, setBudgetDollars] = useState("1000");
  const [skillsString, setSkillsString] = useState("Next.js, TypeScript, Tailwind CSS");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const budgetNumber = parseFloat(budgetDollars);
    if (isNaN(budgetNumber) || budgetNumber <= 0) {
      setError("Please provide a valid positive budget amount");
      setLoading(false);
      return;
    }

    const budgetMinor = Math.round(budgetNumber * 100);
    const skillsRequired = skillsString
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          description,
          budgetMinor,
          skillsRequired,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to post job");
      } else {
        router.push(`/jobs/${data.id}`);
        router.refresh();
      }
    } catch {
      setError("Network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Post a New Job Opportunity</h1>
        <p className="text-xs text-slate-500">
          Define milestone deliverables. Your escrow funds will be held in sandbox custody until you approve work.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Build Milestone Escrow Smart Backend"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
            >
              <option value="Web & Software Architecture">Web & Software Architecture</option>
              <option value="UI/UX & Frontend">UI/UX & Frontend</option>
              <option value="Fintech & Security">Fintech & Security</option>
              <option value="Mobile Development">Mobile Development</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Estimated Total Budget (USD)
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="number"
                step="1"
                min="5"
                required
                value={budgetDollars}
                onChange={(e) => setBudgetDollars(e.target.value)}
                placeholder="1000"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Stored as integer minor units ({parseInt(budgetDollars || "0", 10) * 100} cents)</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Required Technical Skills (comma separated)
          </label>
          <input
            type="text"
            required
            value={skillsString}
            onChange={(e) => setSkillsString(e.target.value)}
            placeholder="Next.js, TypeScript, Tailwind, Prisma"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Detailed Project Specifications & Deliverables
          </label>
          <textarea
            rows={6}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the architectural requirements, expected milestones, acceptance criteria, and deliverable format..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg text-sm transition shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          {loading ? (
            <span>Publishing listing...</span>
          ) : (
            <>
              <PlusCircle className="w-4 h-4" />
              <span>Publish Job Listing</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

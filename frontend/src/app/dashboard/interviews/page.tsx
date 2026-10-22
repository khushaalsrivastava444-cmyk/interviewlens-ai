"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { api } from "@/lib/api";
import { InterviewSession } from "@/types";
import {
  Sparkles,
  Award,
  Clock,
  Layers,
  ArrowRight,
  Search,
  Filter,
  Plus,
  Play,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Video,
} from "lucide-react";

export default function InterviewsHistoryPage() {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "in_progress">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    async function fetchSessions() {
      try {
        setLoading(true);
        const data = await api.getSessions();
        setSessions(data);
      } catch (err: any) {
        setError(err.message || "Failed to load interview sessions.");
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, []);

  // Filtered sessions
  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.target_role && s.target_role.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" ? true : s.status === statusFilter;

    const matchesCategory =
      categoryFilter === "all" ? true : s.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const categories = Array.from(new Set(sessions.map((s) => s.category)));

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                <Layers className="h-8 w-8 text-indigo-500" />
                Mock Interview Sessions
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Review your historical interview evaluations, interactive timelines, and continue active practice sessions.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/interviews/upload"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-sm font-semibold transition-colors"
              >
                <Video className="h-4 w-4 text-emerald-400" />
                Upload Recording
              </Link>
              <Link
                href="/dashboard/interviews/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New AI Interview
              </Link>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by title, role, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
              {(["all", "completed", "in_progress"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
                    statusFilter === st
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {st.replace("_", " ")}
                </button>
              ))}
            </div>

            {/* Category Dropdown */}
            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 focus:outline-none focus:border-indigo-500 shrink-0"
              >
                <option value="all">All Domains ({sessions.length})</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.replace("_", " ").toUpperCase()}
                  </option>
                ))}
              </select>
            )}

          </div>

          {/* Sessions Grid */}
          {loading ? (
            <div className="py-20 text-center space-y-4">
              <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin mx-auto" />
              <p className="text-sm text-slate-400">Loading interview sessions...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-950/20 border border-red-500/30 rounded-2xl text-center space-y-3">
              <AlertCircle className="h-8 w-8 text-red-400 mx-auto" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-4">
              <Sparkles className="h-10 w-10 text-slate-600 mx-auto" />
              <div>
                <h3 className="text-lg font-bold text-white">No interview sessions found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  {sessions.length === 0
                    ? "Start your first adaptive multimodal AI mock interview to evaluate your technical communication."
                    : "No interview sessions match your current filter criteria."}
                </p>
              </div>
              <Link
                href="/dashboard/interviews/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-colors"
              >
                <Plus className="h-4 w-4" /> Start Interview
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSessions.map((session) => {
                const isCompleted = session.status === "completed";
                const score = session.overall_score;

                return (
                  <div
                    key={session.id}
                    className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 flex flex-col justify-between transition-all hover:shadow-xl hover:shadow-indigo-500/5 group"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                          {session.category.replace("_", " ")}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            isCompleted
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {isCompleted ? "Completed" : "In Progress"}
                        </span>
                      </div>

                      {/* Title & Target Role */}
                      <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                        {session.title || `${session.category.replace("_", " ")} Interview`}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Target Role: <span className="text-slate-300 font-medium">{session.target_role || "Candidate"}</span>
                      </p>

                      {/* Score & Turns Meta */}
                      <div className="grid grid-cols-2 gap-3 my-5 p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl">
                        <div>
                          <span className="text-[11px] text-slate-500 font-medium block">Overall Score</span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-xl font-extrabold text-white">
                              {score ? score.toFixed(1) : "—"}
                            </span>
                            {score && <span className="text-[11px] text-slate-500">/ 5.0</span>}
                          </div>
                        </div>

                        <div>
                          <span className="text-[11px] text-slate-500 font-medium block">Budget / Turns</span>
                          <div className="text-xl font-extrabold text-white mt-0.5">
                            {session.current_question_index}
                            <span className="text-xs text-slate-500 font-normal"> / {session.question_budget}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        {new Date(session.created_at).toLocaleDateString()}
                      </span>

                      {isCompleted ? (
                        <Link
                          href={`/dashboard/interviews/report/${session.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors"
                        >
                          View Report
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      ) : (
                        <Link
                          href={`/dashboard/interviews/session/${session.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-semibold shadow-md shadow-amber-500/20 transition-colors"
                        >
                          <Play className="h-3 w-3 fill-current" />
                          Resume
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

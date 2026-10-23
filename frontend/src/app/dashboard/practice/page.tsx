"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { api } from "@/lib/api";
import { LearningPlan } from "@/types";
import {
  BookOpen,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Plus,
  RefreshCw,
  FileText,
  Target,
} from "lucide-react";

export default function PracticePlansPage() {
  const [plans, setPlans] = useState<LearningPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlans() {
      try {
        setLoading(true);
        const data = await api.getPracticePlans();
        setPlans(data);
      } catch (err: any) {
        setError(err.message || "Failed to load practice plans.");
      } finally {
        setLoading(false);
      }
    }
    loadPlans();
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-indigo-500" />
                Personalized Practice Plans
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Follow milestone roadmaps tailored to your target engineering roles and interview performance gaps.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/resume"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-sm font-semibold transition-colors"
              >
                <FileText className="h-4 w-4 text-indigo-400" />
                Resume & JD Matcher
              </Link>
              <Link
                href="/dashboard/interviews/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Start Mock Interview
              </Link>
            </div>
          </div>

          {/* Body Content */}
          {loading ? (
            <div className="py-20 text-center space-y-4">
              <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin mx-auto" />
              <p className="text-sm text-slate-400">Loading personalized practice plans...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-950/20 border border-red-500/30 rounded-2xl text-center space-y-3">
              <AlertTriangle className="h-8 w-8 text-red-400 mx-auto" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-12 text-center space-y-4">
              <Target className="h-12 w-12 text-slate-600 mx-auto" />
              <div>
                <h3 className="text-lg font-bold text-white">No practice plans generated yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  Upload your resume or audit a Job Description in Resume Intelligence to synthesize your first customized 3-phase practice roadmap.
                </p>
              </div>
              <Link
                href="/dashboard/resume"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-colors"
              >
                Go to Resume Intelligence
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6"
                >
                  {/* Plan Top Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                          Target Role
                        </span>
                        <span className="text-xs text-slate-500">
                          Created on {new Date(plan.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-white">{plan.target_role}</h3>
                    </div>

                    <Link
                      href="/dashboard/interviews/new"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors shrink-0"
                    >
                      <Sparkles className="h-4 w-4" /> Practice This Role
                    </Link>
                  </div>

                  {/* Identified Knowledge Gaps */}
                  {plan.identified_gaps && plan.identified_gaps.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                        Targeted Technical Focus Areas
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {plan.identified_gaps.map((gap, gIdx) => (
                          <span
                            key={gIdx}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20"
                          >
                            {gap}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Milestones Roadmap */}
                  {plan.milestones && plan.milestones.length > 0 && (
                    <div className="space-y-3">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                        Multi-Phase Execution Roadmap
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {plan.milestones.map((m, mIdx) => (
                          <div
                            key={mIdx}
                            className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3"
                          >
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                                {m.phase}
                              </span>
                              <h4 className="text-sm font-bold text-white">{m.title}</h4>
                              <p className="text-xs text-slate-300 leading-relaxed">
                                {m.recommended_practice}
                              </p>
                            </div>

                            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-1">
                              {m.focus_areas.map((fa, fIdx) => (
                                <span
                                  key={fIdx}
                                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-900 text-slate-400 border border-slate-800"
                                >
                                  {fa}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Practice Questions Bank */}
                  {plan.practice_questions && plan.practice_questions.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                        Curated Interview Practice Questions
                      </span>
                      <div className="space-y-2">
                        {plan.practice_questions.map((q, qIdx) => (
                          <div
                            key={qIdx}
                            className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                  {q.topic}
                                </span>
                                <span className="text-[10px] text-slate-500 uppercase">{q.difficulty}</span>
                              </div>
                              <p className="text-xs text-slate-200 font-medium">"{q.question}"</p>
                            </div>

                            <Link
                              href="/dashboard/interviews/new"
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors shrink-0 flex items-center gap-1.5"
                            >
                              Practice <ArrowRight className="h-3 w-3" />
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

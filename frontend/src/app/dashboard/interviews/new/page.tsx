"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  Code,
  Terminal,
  Database,
  BarChart,
  Cpu,
  Sparkles,
  Layers,
  Server,
  ShieldCheck,
  Video,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";

const CATEGORIES = [
  { id: "ml_dl", name: "Machine Learning & Deep Learning", icon: Cpu, badge: "AI/ML" },
  { id: "nlp_llm_rag", name: "NLP, Transformers, LLMs & RAG", icon: Sparkles, badge: "Generative AI" },
  { id: "python", name: "Python & Programming Fundamentals", icon: Code, badge: "Core" },
  { id: "dsa", name: "Data Structures & Algorithms", icon: Terminal, badge: "Problem Solving" },
  { id: "sql_dbms", name: "SQL & Relational DBMS", icon: Database, badge: "Data" },
  { id: "data_science_stats", name: "Data Science & Statistics", icon: BarChart, badge: "Analytics" },
  { id: "mlops", name: "ML Engineering & MLOps", icon: Layers, badge: "Production" },
  { id: "backend_sys_design", name: "Backend & System Design", icon: Server, badge: "Scalability" },
  { id: "resume_defense", name: "Resume & Project Defense", icon: ShieldCheck, badge: "Experience" },
  { id: "behavioral", name: "Behavioral & HR Communication", icon: Video, badge: "Soft Skills" },
];

const BUDGETS = [
  { count: 3, label: "3 Questions", desc: "Fast Diagnostic (~10 min)" },
  { count: 5, label: "5 Questions", desc: "Standard Mock Interview (~20 min)" },
  { count: 8, label: "8 Questions", desc: "Comprehensive Deep-Dive (~35 min)" },
];

export default function NewInterviewSessionPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState("ml_dl");
  const [difficulty, setDifficulty] = useState("entry");
  const [questionBudget, setQuestionBudget] = useState(5);
  const [customTitle, setCustomTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartSession = async () => {
    setLoading(true);
    setError(null);

    const categoryObj = CATEGORIES.find((c) => c.id === selectedCategory);
    const title = customTitle || `${categoryObj?.name || "Technical"} Mock Interview`;

    try {
      const session = await api.createSession({
        title,
        category: selectedCategory,
        difficulty,
        targetRole: user?.target_role || "Machine Learning Engineer",
        questionBudget,
      });
      router.push(`/dashboard/interviews/session/${session.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to start interview session.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1">
      <Sidebar />
      <div className="flex-1 p-6 lg:p-8 max-w-5xl space-y-8">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Stateful Interview Orchestrator</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Configure Adaptive Mock Interview
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Choose your target domain and question budget. The engine tracks your answer strengths and dynamically generates follow-ups targeted at your exact knowledge gaps.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Select Category */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-white block">
            1. Select Interview Category
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    isSelected
                      ? "bg-blue-600/15 border-blue-500 text-white shadow-md shadow-blue-500/10"
                      : "bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Icon className={`h-5 w-5 ${isSelected ? "text-blue-400" : "text-slate-400"}`} />
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {cat.badge}
                    </span>
                  </div>
                  <div className="text-xs font-medium line-clamp-2">{cat.name}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Difficulty & Budget */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Difficulty */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-white block">
              2. Target Experience Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "entry", label: "Entry Level", sub: "0-2 yrs" },
                { id: "mid", label: "Mid Level", sub: "2-5 yrs" },
                { id: "senior", label: "Senior", sub: "5+ yrs" },
              ].map((diff) => (
                <button
                  key={diff.id}
                  type="button"
                  onClick={() => setDifficulty(diff.id)}
                  className={`p-3 rounded-xl border text-center transition ${
                    difficulty === diff.id
                      ? "bg-blue-600/15 border-blue-500 text-white"
                      : "bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-400"
                  }`}
                >
                  <div className="text-xs font-semibold">{diff.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{diff.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Question Budget */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-white block">
              3. Question Budget
            </label>
            <div className="grid grid-cols-3 gap-2">
              {BUDGETS.map((b) => (
                <button
                  key={b.count}
                  type="button"
                  onClick={() => setQuestionBudget(b.count)}
                  className={`p-3 rounded-xl border text-center transition ${
                    questionBudget === b.count
                      ? "bg-blue-600/15 border-blue-500 text-white"
                      : "bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-400"
                  }`}
                >
                  <div className="text-xs font-semibold">{b.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{b.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={handleStartSession}
            disabled={loading}
            className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition shadow-lg shadow-blue-600/30 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            <span>{loading ? "Starting Session..." : "Begin Adaptive Interview"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

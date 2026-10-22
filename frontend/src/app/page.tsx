import Link from "next/link";
import {
  Video,
  Sparkles,
  Layers,
  Cpu,
  BarChart,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  Code,
  Database,
  Terminal,
} from "lucide-react";

const CATEGORIES = [
  { name: "Python & Programming Fundamentals", icon: Code, badge: "Core" },
  { name: "Data Structures & Algorithms", icon: Terminal, badge: "Problem Solving" },
  { name: "SQL & Relational DBMS", icon: Database, badge: "Data" },
  { name: "Data Science & Statistics", icon: BarChart, badge: "Analytics" },
  { name: "Machine Learning & Deep Learning", icon: Cpu, badge: "AI/ML" },
  { name: "NLP, Transformers, LLMs & RAG", icon: Sparkles, badge: "Generative AI" },
  { name: "ML Engineering & MLOps", icon: Layers, badge: "Production" },
  { name: "Backend & System Design", icon: ServerIcon, badge: "Scalability" },
  { name: "Resume & Project Defense", icon: ShieldCheck, badge: "Experience" },
  { name: "Behavioral & HR Communication", icon: Video, badge: "Soft Skills" },
];

function ServerIcon(props: any) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
      <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
      <line x1="6" x2="6.01" y1="6" y2="6" />
      <line x1="6" x2="6.01" y1="18" y2="18" />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center">
      {/* Hero Section */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Multimodal AI Mock Interview Coach for Engineers</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Master Technical Interviews with{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
            Real Multimodal AI
          </span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Record your technical answers. Get timestamped speech transcripts, measurable pacing analytics, rubric-based technical evaluations, and intelligent adaptive follow-up questions.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/30 transition"
          >
            <span>Start Practice Interview</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 transition"
          >
            Candidate Sign In
          </Link>
        </div>
      </section>

      {/* Multimodal Architecture Pipeline */}
      <section className="w-full border-y border-slate-800 bg-slate-900/30 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-white">How InterviewLens AI Evaluates Your Performance</h2>
            <p className="text-sm text-slate-400 mt-2">A deterministic, measurable signal pipeline paired with contextual semantic LLM evaluation</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-xl bg-slate-900/70 border border-slate-800 text-left">
              <div className="h-10 w-10 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center mb-4">
                <Video className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">1. Video Ingestion</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Streamed uploads with SHA-256 validation, FFmpeg audio extraction, and bounded OpenCV visual quality checks.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-slate-900/70 border border-slate-800 text-left">
              <div className="h-10 w-10 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-4">
                <Terminal className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">2. Speech Transcription</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Timestamped segments aligned with original recording timestamps, editable by candidate before final scoring.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-slate-900/70 border border-slate-800 text-left">
              <div className="h-10 w-10 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-4">
                <BarChart className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">3. Measurable Analytics</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Deterministic Python computations: Words Per Minute, filler word density, pause ratio, and silence duration.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-slate-900/70 border border-slate-800 text-left">
              <div className="h-10 w-10 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center mb-4">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">4. Adaptive Follow-Ups</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Knowledge-gap identification triggers focused drill-down questions instead of generic random queries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 10 Interview Categories */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">10 Specialized Technical Interview Categories</h2>
          <p className="text-slate-400 mt-2 text-sm">Tailored scoring rubrics and question banks designed for entry-level and early-career engineers</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.name}
                className="p-4 rounded-lg bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Icon className="h-5 w-5 text-blue-400" />
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                      {cat.badge}
                    </span>
                  </div>
                  <h4 className="text-sm font-medium text-slate-200">{cat.name}</h4>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

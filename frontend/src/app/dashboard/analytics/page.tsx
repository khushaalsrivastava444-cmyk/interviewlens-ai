"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { api } from "@/lib/api";
import { BenchmarkRunResult, RetrievalResult } from "@/types";
import {
  BarChart2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Search,
  RefreshCw,
  Cpu,
  BookOpen,
  TrendingUp,
  Activity,
  ArrowRight,
  ShieldCheck,
  Database,
  Terminal,
} from "lucide-react";

export default function AnalyticsAndRAGPage() {
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkRunResult | null>(null);
  const [runningBenchmark, setRunningBenchmark] = useState(false);

  // RAG Search State
  const [query, setQuery] = useState("prevent data leakage feature scaling cross validation");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [retrieving, setRetrieving] = useState(false);
  const [searchResults, setSearchResults] = useState<RetrievalResult[]>([]);

  // Knowledge Corpus State
  const [corpus, setCorpus] = useState<any[]>([]);
  const [loadingCorpus, setLoadingCorpus] = useState(true);

  useEffect(() => {
    async function loadInitialData() {
      try {
        // Run initial benchmark
        setRunningBenchmark(true);
        const bResult = await api.runBenchmark();
        setBenchmarkResult(bResult);
      } catch (err) {
        console.error("Failed to load benchmark:", err);
      } finally {
        setRunningBenchmark(false);
      }

      try {
        // Load knowledge corpus
        setLoadingCorpus(true);
        const corpusData = await api.getKnowledgeCorpus();
        setCorpus(corpusData);
      } catch (err) {
        console.error("Failed to load corpus:", err);
      } finally {
        setLoadingCorpus(false);
      }

      // Initial RAG retrieval
      try {
        const initialRet = await api.retrieveKnowledge("prevent data leakage feature scaling cross validation", undefined, 2);
        setSearchResults(initialRet);
      } catch {}
    }

    loadInitialData();
  }, []);

  const handleRunBenchmark = async () => {
    try {
      setRunningBenchmark(true);
      const res = await api.runBenchmark();
      setBenchmarkResult(res);
    } catch (err: any) {
      alert(err.message || "Failed to execute benchmark suite.");
    } finally {
      setRunningBenchmark(false);
    }
  };

  const handleSearchRAG = async () => {
    if (!query.trim()) return;
    try {
      setRetrieving(true);
      const res = await api.retrieveKnowledge(query, selectedCategory, 3);
      setSearchResults(res);
    } catch (err: any) {
      alert(err.message || "Failed to retrieve knowledge chunks.");
    } finally {
      setRetrieving(false);
    }
  };

  const samplePresets = [
    { label: "Data Leakage Scaling", q: "prevent data leakage feature scaling cross validation pipeline", cat: "ml_dl" },
    { label: "CPython GIL Internals", q: "GIL Global Interpreter Lock multithreading CPU bound memory", cat: "python" },
    { label: "RAG Chunking & Overlap", q: "chunk size sliding window overlap dense vector similarity", cat: "nlp_llm_rag" },
    { label: "PostgreSQL B-Tree Scans", q: "B-tree index sequential scan selectivity cost query planner", cat: "sql_dbms" },
    { label: "Distributed Caching", q: "Cache-Aside pattern cache stampede Redis TTL invalidation", cat: "backend_sys_design" },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                <BarChart2 className="h-8 w-8 text-indigo-500" />
                Performance Analytics & RAG Grounding
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Audit scoring calibration rigor, test semantic knowledge retrieval, and explore authoritative technical reference documents.
              </p>
            </div>

            <button
              onClick={handleRunBenchmark}
              disabled={runningBenchmark}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-colors disabled:opacity-50 shrink-0"
            >
              {runningBenchmark ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Activity className="h-4 w-4" />
              )}
              Re-run Scoring Benchmark
            </button>
          </div>

          {/* Section A: Benchmark Calibration Metrics */}
          {benchmarkResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  Automated Evaluation Benchmark & Calibration
                </h3>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  {benchmarkResult.calibration_status}
                </span>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Score Monotonicity
                  </span>
                  <div className="text-3xl font-extrabold text-white mt-1">
                    {benchmarkResult.monotonic_score_pass_rate}%
                  </div>
                  <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> High &gt; Med &ge; Low verified
                  </p>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Gap Detection Accuracy
                  </span>
                  <div className="text-3xl font-extrabold text-white mt-1">
                    {benchmarkResult.gap_detection_accuracy}%
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Omission recall rate</p>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Semantic Grounding
                  </span>
                  <div className="text-3xl font-extrabold text-white mt-1">
                    {benchmarkResult.grounding_accuracy}%
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Factual reference consistency</p>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Mean Evaluation Latency
                  </span>
                  <div className="text-3xl font-extrabold text-white mt-1">
                    {benchmarkResult.mean_evaluation_latency_ms}ms
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Sub-100ms deterministic execution</p>
                </div>
              </div>

              {/* Benchmark Cases Matrix Table */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Competency Tier Calibration Matrix ({benchmarkResult.total_cases} Domains Tested)
                  </span>
                  <span className="text-xs text-slate-500">Scale: 0.0 to 5.0</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-3.5 pl-5">Domain</th>
                        <th className="p-3.5">High Tier</th>
                        <th className="p-3.5">Medium Tier</th>
                        <th className="p-3.5">Low Tier</th>
                        <th className="p-3.5">Score Spread</th>
                        <th className="p-3.5">Monotonicity</th>
                        <th className="p-3.5 pr-5">Grounding</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-200">
                      {benchmarkResult.detailed_results.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-850/50 transition-colors">
                          <td className="p-3.5 pl-5 font-semibold text-white uppercase tracking-wider text-[11px]">
                            {row.category.replace(/_/g, " ")}
                          </td>
                          <td className="p-3.5 font-bold text-emerald-400">{row.high_score.toFixed(1)}</td>
                          <td className="p-3.5 font-medium text-indigo-300">{row.medium_score.toFixed(1)}</td>
                          <td className="p-3.5 font-medium text-amber-400">{row.low_score.toFixed(1)}</td>
                          <td className="p-3.5 text-slate-400 font-mono">
                            +{(row.high_score - row.low_score).toFixed(1)}
                          </td>
                          <td className="p-3.5">
                            {row.monotonic ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                              </span>
                            ) : (
                              <span className="text-red-400 font-semibold">Failed</span>
                            )}
                          </td>
                          <td className="p-3.5 pr-5 text-slate-300 font-mono">
                            {(row.grounding_coverage * 100).toFixed(0)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Section B: Interactive Hybrid RAG Semantic Retrieval Sandbox */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Database className="h-5 w-5 text-indigo-400" />
                Hybrid RAG Knowledge Retrieval Sandbox
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Test dense vector similarity combined with sparse lexical matching across authoritative engineering documentation.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Try Presets:</span>
              {samplePresets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(preset.q);
                    setSelectedCategory(preset.cat);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter query or candidate technical assertion..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-auto px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 focus:outline-none focus:border-indigo-500 shrink-0"
              >
                <option value="all">All Domains</option>
                <option value="ml_dl">ML & Deep Learning</option>
                <option value="nlp_llm_rag">NLP & RAG</option>
                <option value="python">Python Fundamentals</option>
                <option value="sql_dbms">SQL & DBMS</option>
                <option value="backend_sys_design">Backend & System Design</option>
                <option value="mlops">MLOps</option>
              </select>

              <button
                onClick={handleSearchRAG}
                disabled={retrieving || !query.trim()}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
              >
                {retrieving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Retrieve Chunks
              </button>
            </div>

            {/* Ranked Retrieval Results */}
            {searchResults.length > 0 && (
              <div className="space-y-4 pt-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Top Ranked Reference Chunks ({searchResults.length})
                </span>

                <div className="space-y-4">
                  {searchResults.map((res, idx) => (
                    <div
                      key={res.chunk_id}
                      className="p-5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                            Rank #{idx + 1}
                          </span>
                          <h4 className="text-sm font-bold text-white">{res.title}</h4>
                        </div>

                        {/* Hybrid Score Badges */}
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            Hybrid: {(res.hybrid_score * 100).toFixed(1)}%
                          </span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-900 text-slate-400 border border-slate-800">
                            Cosine: {(res.similarity_score * 100).toFixed(1)}%
                          </span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-900 text-slate-400 border border-slate-800">
                            Lexical: {(res.lexical_score * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed font-normal">
                        {res.content}
                      </p>

                      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-slate-500 mr-1 font-medium">Ground Truth Mechanisms:</span>
                        {res.key_mechanisms.map((mech, mIdx) => (
                          <span
                            key={mIdx}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950/40 text-emerald-300 border border-emerald-500/20"
                          >
                            {mech}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section C: Authoritative Technical Knowledge Base Corpus */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-400" />
                Authoritative Knowledge Corpus ({corpus.length} Reference Topics)
              </h3>
              <span className="text-xs text-slate-400">Curated Ground Truth for Rubrics</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {corpus.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                        {item.category.replace(/_/g, " ")}
                      </span>
                      <span className="text-[11px] text-slate-500">{item.topic}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white">{item.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                      {item.content}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                    {item.key_mechanisms.map((mech: string, mIdx: number) => (
                      <span
                        key={mIdx}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-slate-400 border border-slate-800"
                      >
                        {mech}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

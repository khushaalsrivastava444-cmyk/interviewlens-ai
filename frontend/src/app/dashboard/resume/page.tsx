"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { api } from "@/lib/api";
import {
  Resume,
  JobDescriptionMatchResponse,
  ProjectDefenseQuestion,
  LearningPlan,
} from "@/types";
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Award,
  Layers,
  ArrowRight,
  TrendingUp,
  Briefcase,
  GraduationCap,
  RefreshCw,
  Search,
  ExternalLink,
  Target,
  BookOpen,
  Cpu,
  ShieldAlert,
} from "lucide-react";

export default function ResumeIntelligencePage() {
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Active view tab: "profile" | "match" | "defense" | "plan"
  const [activeTab, setActiveTab] = useState<"profile" | "match" | "defense" | "plan">("profile");

  // Job Description Matcher State
  const [targetRole, setTargetRole] = useState("Machine Learning Engineer");
  const [jdText, setJdText] = useState("");
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<JobDescriptionMatchResponse | null>(null);

  // Project Defense Questions State
  const [defenseQuestions, setDefenseQuestions] = useState<ProjectDefenseQuestion[]>([]);
  const [loadingDefense, setLoadingDefense] = useState(false);

  // Learning Plan State
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [learningPlan, setLearningPlan] = useState<LearningPlan | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch initial resume
  useEffect(() => {
    async function loadResume() {
      try {
        setLoading(true);
        const data = await api.getLatestResume();
        setResume(data);
      } catch {
        // No resume uploaded yet
        setResume(null);
      } finally {
        setLoading(false);
      }
    }
    loadResume();
  }, []);

  // Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setUploadError(null);
      const uploaded = await api.uploadResume(file);
      setResume(uploaded);
      // Reset dependent tabs
      setMatchResult(null);
      setDefenseQuestions([]);
      setLearningPlan(null);
      setActiveTab("profile");
    } catch (err: any) {
      setUploadError(err.message || "Failed to parse resume.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Run JD Match
  const handleMatchJobDescription = async () => {
    if (!resume || !jdText.trim()) return;
    try {
      setMatching(true);
      const res = await api.matchJobDescription(resume.id, {
        job_description_text: jdText,
        target_role: targetRole,
      });
      setMatchResult(res);
    } catch (err: any) {
      alert(err.message || "Failed to analyze Job Description.");
    } finally {
      setMatching(false);
    }
  };

  // Load Defense Questions
  const handleLoadDefenseQuestions = async () => {
    if (!resume) return;
    try {
      setLoadingDefense(true);
      const res = await api.getProjectDefenseQuestions(resume.id);
      setDefenseQuestions(res.questions);
      setActiveTab("defense");
    } catch (err: any) {
      alert(err.message || "Failed to generate project defense questions.");
    } finally {
      setLoadingDefense(false);
    }
  };

  // Generate Personalized Practice Plan
  const handleGeneratePlan = async () => {
    if (!resume) return;
    try {
      setGeneratingPlan(true);
      const res = await api.generatePracticePlan(resume.id, {
        target_role: targetRole,
        job_description_text: jdText || undefined,
      });
      setLearningPlan(res);
      setActiveTab("plan");
    } catch (err: any) {
      alert(err.message || "Failed to generate practice plan.");
    } finally {
      setGeneratingPlan(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                <FileText className="h-8 w-8 text-indigo-500" />
                Resume Intelligence & ATS Optimization
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Parse candidate technical competencies, audit job description alignment, and generate architectural project defense questions.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,.md"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {resume ? "Update Resume" : "Upload Resume"}
              </button>
            </div>
          </div>

          {/* Upload Error Alert */}
          {uploadError && (
            <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-300 text-sm">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* If No Resume Uploaded Yet */}
          {!loading && !resume && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="bg-slate-900/40 border-2 border-dashed border-slate-800 hover:border-indigo-500/60 rounded-3xl p-12 text-center space-y-4 cursor-pointer transition-all group"
            >
              <div className="h-16 w-16 rounded-2xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <Upload className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Upload your resume to begin</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Supports PDF, DOCX, and TXT formats up to 15MB. Automatically extracts technical skills, projects, and architecture achievements.
                </p>
              </div>
              <span className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors">
                Select File
              </span>
            </div>
          )}

          {/* Active Resume Showcase */}
          {resume && (
            <>
              {/* Quick Resume Metadata Header */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{resume.filename}</h3>
                    <p className="text-xs text-slate-400">
                      Parsed on {new Date(resume.created_at).toLocaleDateString()} • {resume.parsed_skills.length} skills • {resume.parsed_projects.length} projects extracted
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLoadDefenseQuestions}
                    disabled={loadingDefense}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2"
                  >
                    <ShieldAlert className="h-4 w-4 text-amber-400" />
                    Project Defense Questions
                  </button>
                  <Link
                    href="/dashboard/interviews/new?category=resume_defense"
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors flex items-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Start Defense Mock
                  </Link>
                </div>
              </div>

              {/* Sub-Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                {[
                  { id: "profile", label: "Parsed Technical Profile", icon: Cpu },
                  { id: "match", label: "Job Description Matcher (ATS)", icon: Target },
                  { id: "defense", label: "Project Defense Questions", icon: ShieldAlert },
                  { id: "plan", label: "Personalized Practice Plan", icon: BookOpen },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as any);
                        if (tab.id === "defense" && defenseQuestions.length === 0) {
                          handleLoadDefenseQuestions();
                        }
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* TAB 1: Parsed Technical Profile */}
              {activeTab === "profile" && (
                <div className="space-y-6">
                  {/* Categorized Skills Cloud */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Cpu className="h-5 w-5 text-indigo-400" />
                        Domain Skill Categorization
                      </h3>
                      <span className="text-xs text-slate-400">
                        {resume.parsed_skills.length} verified technical keywords
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(resume.skills_by_category).map(([category, skills]) => (
                        <div
                          key={category}
                          className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-2.5"
                        >
                          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block">
                            {category.replace(/_/g, " ")}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {skills.map((s) => (
                              <span
                                key={s}
                                className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-900 text-slate-300 border border-slate-700/80"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Extracted Projects */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-indigo-400" />
                      Extracted Technical Projects ({resume.parsed_projects.length})
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {resume.parsed_projects.map((proj, pIdx) => (
                        <div
                          key={pIdx}
                          className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-base font-bold text-white">{proj.name}</h4>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {proj.description}
                            </p>

                            {/* Quantifiable Metrics */}
                            {proj.metrics && proj.metrics.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {proj.metrics.map((m, mIdx) => (
                                  <span
                                    key={mIdx}
                                    className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  >
                                    Claim: {m}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Highlights */}
                            {proj.highlights && proj.highlights.length > 1 && (
                              <ul className="space-y-1 pt-2">
                                {proj.highlights.slice(1, 3).map((hl, hIdx) => (
                                  <li key={hIdx} className="text-[11px] text-slate-400 flex items-start gap-1.5">
                                    <span className="h-1 w-1 rounded-full bg-indigo-400 shrink-0 mt-1.5" />
                                    <span>{hl}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          {/* Technologies */}
                          <div className="pt-3 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                            {proj.technologies.map((t) => (
                              <span
                                key={t}
                                className="px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-950/40 text-indigo-300 border border-indigo-500/20"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Job Description Matcher (ATS) */}
              {activeTab === "match" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left: Input Form */}
                  <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Target className="h-5 w-5 text-indigo-400" />
                        Job Description Target
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Paste the target position's job requirements to calculate ATS keyword overlap and identify technical blind spots.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-400 block mb-1">Target Role Title</label>
                        <input
                          type="text"
                          value={targetRole}
                          onChange={(e) => setTargetRole(e.target.value)}
                          placeholder="e.g. Senior Machine Learning Engineer"
                          className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-400 block mb-1">Job Description Requirements</label>
                        <textarea
                          rows={8}
                          value={jdText}
                          onChange={(e) => setJdText(e.target.value)}
                          placeholder="Paste requirements, required qualifications, and tech stack from job posting..."
                          className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 leading-relaxed font-mono"
                        />
                      </div>

                      <button
                        onClick={handleMatchJobDescription}
                        disabled={matching || !jdText.trim()}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {matching ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Target className="h-4 w-4" />
                        )}
                        Run ATS & Skills Alignment
                      </button>
                    </div>
                  </div>

                  {/* Right: Results Analysis */}
                  <div className="lg:col-span-6 space-y-4">
                    {matchResult ? (
                      <div className="space-y-4">
                        {/* Score Card */}
                        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                              ATS Match Index
                            </span>
                            <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-4xl font-extrabold text-white">
                                {matchResult.match_score.toFixed(0)}%
                              </span>
                              <span className="text-xs text-slate-400">Alignment</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              {matchResult.match_score >= 75
                                ? "Strong resume alignment with job requirements"
                                : "Skill gaps identified; tailoring recommended"}
                            </p>
                          </div>

                          <div className="h-16 w-16 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 flex items-center justify-center font-bold text-sm text-indigo-400">
                            {matchResult.match_score.toFixed(0)}%
                          </div>
                        </div>

                        {/* Matched & Missing Skills Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Matched */}
                          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 space-y-2">
                            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                              <CheckCircle2 className="h-4 w-4" /> Matched Skills ({matchResult.matched_skills.length})
                            </span>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {matchResult.matched_skills.map((s) => (
                                <span
                                  key={s}
                                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Missing */}
                          <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-4 space-y-2">
                            <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                              <AlertTriangle className="h-4 w-4" /> Missing Keywords ({matchResult.missing_critical_skills.length})
                            </span>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {matchResult.missing_critical_skills.map((s) => (
                                <span
                                  key={s}
                                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* ATS Recommendations */}
                        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                            ATS Optimization Actions
                          </span>
                          <ul className="space-y-2">
                            {matchResult.ats_recommendations.map((rec, rIdx) => (
                              <li key={rIdx} className="text-xs text-slate-300 flex items-start gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5" />
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>

                          <button
                            onClick={handleGeneratePlan}
                            disabled={generatingPlan}
                            className="w-full mt-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                          >
                            <BookOpen className="h-4 w-4" /> Generate Practice Plan from this Match
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-3">
                        <Target className="h-10 w-10 text-slate-600 mx-auto" />
                        <h4 className="text-base font-bold text-white">No job description analyzed yet</h4>
                        <p className="text-xs text-slate-400 max-w-xs mx-auto">
                          Paste requirements on the left and run analysis to inspect missing qualifications and ATS suggestions.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: Project Defense Questions */}
              {activeTab === "defense" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-amber-400" />
                        Architectural Project Defense Questions
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Targeted questions interrogating engineering baselines, bottlenecks, and trade-offs extracted from your projects.
                      </p>
                    </div>

                    <Link
                      href="/dashboard/interviews/new?category=resume_defense"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors flex items-center gap-2 shrink-0"
                    >
                      <Sparkles className="h-4 w-4" /> Start Defense Mock Session
                    </Link>
                  </div>

                  {defenseQuestions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {defenseQuestions.map((q) => (
                        <div
                          key={q.id}
                          className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
                                {q.project_name}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                {q.technical_focus}
                              </span>
                            </div>
                            <p className="text-sm text-slate-200 font-medium leading-relaxed">
                              "{q.question_text}"
                            </p>
                          </div>

                          <div className="pt-3 border-t border-slate-800/80 space-y-2">
                            <span className="text-[11px] text-slate-500 font-medium block">
                              Key Technical Defense Areas:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {q.sample_expected_topics.map((t, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-slate-400 border border-slate-800"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
                      <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin mx-auto" />
                      <p className="text-xs text-slate-400">Synthesizing project defense questions...</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: Personalized Practice Plan */}
              {activeTab === "plan" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-indigo-400" />
                        Targeted Personal Practice Plan
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        A structured study and mock interview roadmap tailored to your identified technical gaps.
                      </p>
                    </div>

                    <button
                      onClick={handleGeneratePlan}
                      disabled={generatingPlan}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors flex items-center gap-2"
                    >
                      {generatingPlan ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Regenerate Roadmap
                    </button>
                  </div>

                  {learningPlan ? (
                    <div className="space-y-6">
                      {/* Milestones Roadmap */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {learningPlan.milestones.map((m, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-3"
                          >
                            <div className="space-y-2">
                              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
                                {m.phase}
                              </span>
                              <h4 className="text-base font-bold text-white">{m.title}</h4>
                              <p className="text-xs text-slate-300 leading-relaxed">
                                {m.recommended_practice}
                              </p>
                            </div>

                            <div className="pt-3 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                              {m.focus_areas.map((fa, fIdx) => (
                                <span
                                  key={fIdx}
                                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-950 text-indigo-300 border border-slate-800"
                                >
                                  {fa}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Curated Question Bank */}
                      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
                        <h4 className="text-base font-bold text-white flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-indigo-400" />
                          Curated Practice Questions
                        </h4>

                        <div className="space-y-3">
                          {learningPlan.practice_questions.map((pq, qIdx) => (
                            <div
                              key={qIdx}
                              className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                    {pq.topic}
                                  </span>
                                  <span className="text-[10px] text-slate-500 uppercase">{pq.difficulty}</span>
                                </div>
                                <p className="text-xs text-slate-200 font-medium">
                                  "{pq.question}"
                                </p>
                              </div>

                              <Link
                                href="/dashboard/interviews/new"
                                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors shrink-0 flex items-center gap-1.5"
                              >
                                Practice <ArrowRight className="h-3.5 w-3.5" />
                              </Link>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-4">
                      <BookOpen className="h-10 w-10 text-slate-600 mx-auto" />
                      <div>
                        <h4 className="text-base font-bold text-white">No practice plan generated yet</h4>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                          Click the button below to synthesize a customized 3-phase practice plan matching your target role and skill gaps.
                        </p>
                      </div>
                      <button
                        onClick={handleGeneratePlan}
                        disabled={generatingPlan}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors"
                      >
                        Generate Practice Plan
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

        </div>
      </main>
    </div>
  );
}

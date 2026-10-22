"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { api } from "@/lib/api";
import {
  SessionReport,
  QuestionEvaluationDetail,
  TimelineMarker,
} from "@/types";
import {
  Award,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Mic,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Layers,
  Activity,
  FileText,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink,
  Info,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export default function SessionReportPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [report, setReport] = useState<SessionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected question for video & timeline focus
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});

  // Video player controls & timeline sync
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [highlightedMarker, setHighlightedMarker] = useState<TimelineMarker | null>(null);

  useEffect(() => {
    async function loadReport() {
      try {
        setLoading(true);
        const data = await api.getSessionReport(sessionId);
        setReport(data);

        // Expand the first question by default
        if (data.questions_evaluations && data.questions_evaluations.length > 0) {
          setExpandedQuestions({
            [data.questions_evaluations[0].question_id]: true,
          });
        }
      } catch (err: any) {
        setError(err.message || "Failed to load session report.");
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, [sessionId]);

  const activeQuestion: QuestionEvaluationDetail | undefined =
    report?.questions_evaluations[selectedQuestionIndex];

  // Video handlers
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);

    // Check if current time is near any marker
    const activeMarkers = activeQuestion?.timeline_markers || report?.timeline_markers || [];
    const matched = activeMarkers.find((m) => Math.abs(m.timestamp - curr) < 2.0);
    setHighlightedMarker(matched || null);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration || 60);
    }
  };

  const seekToTimestamp = (seconds: number, marker?: TimelineMarker) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      setCurrentTime(seconds);
      if (marker) {
        setHighlightedMarker(marker);
      }
    }
  };

  const toggleQuestionExpand = (qId: string) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = Math.floor(secs % 60);
    return `${mins}:${remaining < 10 ? "0" : ""}${remaining}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-950 text-slate-100">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <RefreshCw className="h-10 w-10 text-indigo-500 animate-spin mx-auto" />
            <p className="text-slate-400 font-medium">Synthesizing multimodal session report...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex min-h-screen bg-slate-950 text-slate-100">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-6 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto" />
            <h2 className="text-xl font-bold text-slate-100">Report Unavailable</h2>
            <p className="text-sm text-slate-400">{error || "Interview session not found."}</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Return to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Markers for the active question or session
  const currentMarkers = activeQuestion?.timeline_markers && activeQuestion.timeline_markers.length > 0
    ? activeQuestion.timeline_markers
    : report.timeline_markers || [];

  // Duration for timeline calculation
  const effectiveDuration = Math.max(
    videoDuration,
    activeQuestion?.speaking_metrics?.answer_duration || 60,
    ...currentMarkers.map((m) => m.timestamp + 5)
  );

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header & Meta */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                  {report.category.replace("_", " ")}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 capitalize border border-slate-700">
                  {report.difficulty} Level
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    report.status === "completed"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}
                >
                  {report.status === "completed" ? "Completed" : "In Progress"}
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">
                {report.title || "Interview Performance Report"}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Target Role: <span className="text-slate-200 font-medium">{report.target_role || "Engineering Candidate"}</span> • Evaluated on {new Date(report.created_at).toLocaleDateString()}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/interviews/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-sm font-semibold transition-colors"
              >
                <RefreshCw className="h-4 w-4 text-indigo-400" />
                Practice Again
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-colors"
              >
                Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Overall Score */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Score</span>
                <Award className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white">{report.overall_score.toFixed(1)}</span>
                <span className="text-sm font-medium text-slate-400">/ 5.0</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {report.overall_score >= 4.0
                  ? "Exceeds standard competency"
                  : report.overall_score >= 3.0
                  ? "Meets baseline requirements"
                  : "Targeted practice advised"}
              </p>
            </div>

            {/* Questions Evaluated */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Turns Completed</span>
                <Layers className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white">{report.total_questions}</span>
                <span className="text-sm font-medium text-slate-400">Questions</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Adaptive follow-ups completed</p>
            </div>

            {/* Speaking Pace (WPM) */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Speaking Pace</span>
                <Activity className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white">
                  {report.speaking_averages.avg_words_per_minute || 130}
                </span>
                <span className="text-sm font-medium text-slate-400">WPM</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {report.speaking_averages.avg_words_per_minute >= 115 && report.speaking_averages.avg_words_per_minute <= 165
                  ? "Optimal conversational speed"
                  : "Slightly fast/slow pacing"}
              </p>
            </div>

            {/* Filler Words */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Filler Words</span>
                <Mic className="h-5 w-5 text-rose-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white">
                  {report.speaking_averages.total_filler_words}
                </span>
                <span className="text-sm font-medium text-slate-400">Detected</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {report.speaking_averages.avg_filler_words_per_minute.toFixed(1)} fillers / min
              </p>
            </div>
          </div>

          {/* Section 1: Radar Chart & Acoustic Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Competency Radar Chart */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-indigo-400" />
                    Multimodal Competency Matrix
                  </h3>
                  <span className="text-xs font-medium text-slate-400">vs 3.5 Benchmark</span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Rubric-derived dimensional scores evaluated across all answered interview turns.
                </p>
              </div>

              <div className="h-72 w-full flex items-center justify-center">
                {report.criteria_averages && report.criteria_averages.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={report.criteria_averages}>
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis dataKey="name" stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 5]} stroke="#475569" />
                      <Radar
                        name="Candidate Score"
                        dataKey="score"
                        stroke="#6366f1"
                        fill="#6366f1"
                        fillOpacity={0.45}
                      />
                      <Radar
                        name="Benchmark"
                        dataKey="benchmark_score"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.15}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderColor: "#334155",
                          borderRadius: "0.75rem",
                          color: "#f8fafc",
                          fontSize: "12px",
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-slate-500">No criteria data available yet.</p>
                )}
              </div>

              <div className="flex items-center justify-center gap-6 pt-4 border-t border-slate-800/80 text-xs font-medium">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-indigo-500" />
                  <span className="text-slate-300">Candidate Score</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-500/40 border border-emerald-500" />
                  <span className="text-slate-300">Target Benchmark (3.5)</span>
                </div>
              </div>
            </div>

            {/* Acoustic & Speech Analytics Grid */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Mic className="h-5 w-5 text-emerald-400" />
                    Acoustic Delivery & Speaking Metrics
                  </h3>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-400">
                    Deterministic DSP
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Signal-level silence ratio, pause frequency, and boundary-aware filler phrase extraction.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 my-2">
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                  <span className="text-xs text-slate-400 font-medium">Silence Ratio</span>
                  <div className="text-2xl font-bold text-slate-100 mt-1">
                    {((report.speaking_averages.avg_silence_ratio || 0.12) * 100).toFixed(1)}%
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Healthy pause duration vs speech</p>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                  <span className="text-xs text-slate-400 font-medium">Pause Frequency</span>
                  <div className="text-2xl font-bold text-slate-100 mt-1">
                    {(report.speaking_averages.avg_pause_frequency || 0.45).toFixed(2)}/s
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Natural cadence transitions</p>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                  <span className="text-xs text-slate-400 font-medium">Total Answer Duration</span>
                  <div className="text-2xl font-bold text-slate-100 mt-1">
                    {formatTime(report.speaking_averages.total_speaking_duration || 0)}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Cumulative response time</p>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                  <span className="text-xs text-slate-400 font-medium">Filler Word Rate</span>
                  <div className="text-2xl font-bold text-slate-100 mt-1">
                    {report.speaking_averages.avg_filler_words_per_minute.toFixed(1)} / min
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Low hesitation density</p>
                </div>
              </div>

              {/* Detected Filler Words Breakdown */}
              <div className="mt-4 pt-4 border-t border-slate-800">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Filler Words Breakdown
                </span>
                <div className="flex flex-wrap gap-2">
                  {report.speaking_averages.filler_breakdown &&
                  Object.keys(report.speaking_averages.filler_breakdown).length > 0 ? (
                    Object.entries(report.speaking_averages.filler_breakdown).map(([word, count]) => (
                      <span
                        key={word}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20"
                      >
                        "{word}": <span className="font-bold">{count}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> No excessive filler words detected.
                    </span>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Section 2: Interactive Video Timeline & Evidence Scrubber */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-indigo-400" />
                  Interactive Video Timeline & Evidence Synchronization
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click on any timeline marker below to jump the video directly to verified candidate claims or filler hesitations.
                </p>
              </div>

              {/* Question selector tabs if multiple questions */}
              {report.questions_evaluations.length > 1 && (
                <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {report.questions_evaluations.map((q, idx) => (
                    <button
                      key={q.question_id}
                      onClick={() => {
                        setSelectedQuestionIndex(idx);
                        setCurrentTime(0);
                        if (videoRef.current) {
                          videoRef.current.currentTime = 0;
                        }
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        selectedQuestionIndex === idx
                          ? "bg-indigo-600 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Question {idx + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Video Player + Highlight Banner */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              <div className="lg:col-span-7 bg-black rounded-2xl overflow-hidden border border-slate-800 relative group">
                {activeQuestion?.video_id ? (
                  <video
                    ref={videoRef}
                    src={api.getVideoStreamUrl(activeQuestion.video_id)}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    controls
                    className="w-full aspect-video object-cover"
                  />
                ) : (
                  <div className="w-full aspect-video flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
                    <FileText className="h-12 w-12 text-slate-600 mb-2" />
                    <p className="text-sm font-semibold text-slate-300">Text-Based Answer Submission</p>
                    <p className="text-xs text-slate-500 max-w-xs mt-1">
                      No synchronized video recording was uploaded for this turn. Timeline evidence markers are correlated with transcript timestamps.
                    </p>
                  </div>
                )}
              </div>

              {/* Marker Inspector Card */}
              <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Evidence Inspector
                  </span>
                  {highlightedMarker && (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        highlightedMarker.marker_type === "strength"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {highlightedMarker.marker_type}
                    </span>
                  )}
                </div>

                {highlightedMarker ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs font-semibold">
                      <Clock className="h-3.5 w-3.5" />
                      Timestamp: {formatTime(highlightedMarker.timestamp)}
                    </div>
                    <h4 className="text-base font-bold text-white capitalize">
                      {highlightedMarker.concept}
                    </h4>
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 italic">
                      "{highlightedMarker.quote}"
                    </div>
                    <button
                      onClick={() => seekToTimestamp(highlightedMarker.timestamp, highlightedMarker)}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <Play className="h-3.5 w-3.5" /> Jump to Moment in Video
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-2">
                    <Info className="h-8 w-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">
                      Hover or click any marker on the timeline below to inspect evidence quotes and verified competencies.
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* Horizontal Interactive Timeline Bar */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>{formatTime(currentTime)}</span>
                <span className="text-slate-500">Timeline Scrubber ({formatTime(effectiveDuration)})</span>
                <span>{formatTime(effectiveDuration)}</span>
              </div>

              <div
                className="relative h-5 bg-slate-950 rounded-full border border-slate-800 cursor-pointer overflow-visible select-none"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                  seekToTimestamp(ratio * effectiveDuration);
                }}
              >
                {/* Progress bar */}
                <div
                  className="h-full bg-indigo-600/30 rounded-full"
                  style={{
                    width: `${Math.min(100, (currentTime / (effectiveDuration || 1)) * 100)}%`,
                  }}
                />

                {/* Playhead marker */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-indigo-500 border-2 border-white shadow-lg pointer-events-none transition-all"
                  style={{
                    left: `${Math.min(99, Math.max(1, (currentTime / (effectiveDuration || 1)) * 100))}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                />

                {/* Clickable Evidence Markers */}
                {currentMarkers.map((marker, idx) => {
                  const leftPercent = Math.min(
                    98,
                    Math.max(2, (marker.timestamp / (effectiveDuration || 1)) * 100)
                  );
                  const isStrength = marker.marker_type === "strength";

                  return (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        seekToTimestamp(marker.timestamp, marker);
                      }}
                      className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full border-2 transition-transform hover:scale-150 focus:outline-none ${
                        isStrength
                          ? "bg-emerald-500 border-emerald-300"
                          : "bg-amber-500 border-amber-300"
                      }`}
                      style={{ left: `${leftPercent}%` }}
                      title={`[${formatTime(marker.timestamp)}] ${marker.concept}`}
                    />
                  );
                })}
              </div>

              {/* Marker Legend & Quick Jump Chips */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-emerald-500 border border-emerald-300" />
                    <span>Strength / Core Competency</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-amber-500 border border-amber-300" />
                    <span>Filler / Hesitation</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {currentMarkers.slice(0, 5).map((m, idx) => (
                    <button
                      key={idx}
                      onClick={() => seekToTimestamp(m.timestamp, m)}
                      className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                    >
                      {formatTime(m.timestamp)} • {m.concept.slice(0, 16)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Section 3: Question-by-Question Deep Dive */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-400" />
                Question-by-Question Assessment
              </h3>
              <span className="text-xs text-slate-400">
                {report.questions_evaluations.length} total questions evaluated
              </span>
            </div>

            <div className="space-y-4">
              {report.questions_evaluations.map((q, idx) => {
                const isExpanded = expandedQuestions[q.question_id] ?? false;
                return (
                  <div
                    key={q.question_id}
                    className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden transition-all"
                  >
                    {/* Accordion Header */}
                    <div
                      onClick={() => toggleQuestionExpand(q.question_id)}
                      className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-850/60 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className="h-7 w-7 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          Q{idx + 1}
                        </span>
                        <div>
                          <h4 className="text-base font-semibold text-white">{q.question_text}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-400 capitalize">{q.category.replace("_", " ")}</span>
                            <span className="text-xs text-slate-600">•</span>
                            <span className="text-xs text-slate-400 capitalize">{q.difficulty}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        {q.overall_score !== undefined && (
                          <div className="text-right">
                            <span className="text-lg font-extrabold text-white">
                              {q.overall_score.toFixed(1)}
                            </span>
                            <span className="text-xs text-slate-500 font-medium"> / 5.0</span>
                          </div>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Accordion Body */}
                    {isExpanded && (
                      <div className="p-6 pt-0 border-t border-slate-800/80 space-y-6">
                        
                        {/* Candidate Answer Transcript */}
                        {q.candidate_answer && (
                          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5 mt-4">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                              Recorded Candidate Response
                            </span>
                            <p className="text-sm text-slate-300 leading-relaxed italic">
                              "{q.candidate_answer}"
                            </p>
                          </div>
                        )}

                        {/* Strengths & Missing Concepts Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          {/* Strengths */}
                          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                              <CheckCircle2 className="h-4 w-4" /> Verified Strengths
                            </div>
                            <ul className="space-y-2">
                              {q.strengths && q.strengths.length > 0 ? (
                                q.strengths.map((str, sIdx) => (
                                  <li key={sIdx} className="text-xs text-slate-300 leading-relaxed flex items-start gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                                    <span>{str}</span>
                                  </li>
                                ))
                              ) : (
                                <li className="text-xs text-slate-500 italic">No specific strengths captured.</li>
                              )}
                            </ul>
                          </div>

                          {/* Missing Concepts */}
                          <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                              <AlertTriangle className="h-4 w-4" /> Missing Concepts & Gaps
                            </div>
                            <ul className="space-y-2">
                              {q.missing_concepts && q.missing_concepts.length > 0 ? (
                                q.missing_concepts.map((gap, gIdx) => (
                                  <li key={gIdx} className="text-xs text-slate-300 leading-relaxed flex items-start gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                                    <span>{gap}</span>
                                  </li>
                                ))
                              ) : (
                                <li className="text-xs text-emerald-400 italic">All key rubric criteria covered!</li>
                              )}
                            </ul>
                          </div>

                        </div>

                        {/* Criteria Scores Bar Breakdown */}
                        {q.criteria_scores && q.criteria_scores.length > 0 && (
                          <div className="space-y-3">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                              Rubric Criteria Scores
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {q.criteria_scores.map((crit, cIdx) => (
                                <div
                                  key={cIdx}
                                  className="bg-slate-950/50 border border-slate-800 p-3.5 rounded-xl space-y-2"
                                >
                                  <div className="flex items-center justify-between text-xs font-semibold">
                                    <span className="text-slate-200 capitalize">
                                      {crit.name.replace(/_/g, " ")}
                                    </span>
                                    <span className="text-indigo-400">
                                      {crit.score.toFixed(1)} / 5.0
                                    </span>
                                  </div>
                                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-indigo-500 rounded-full"
                                      style={{ width: `${(crit.score / 5.0) * 100}%` }}
                                    />
                                  </div>
                                  <p className="text-[11px] text-slate-400 leading-relaxed">
                                    {crit.feedback}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Adaptive Follow-up Generated */}
                        {q.recommended_follow_up && (
                          <div className="p-4 bg-indigo-950/30 border border-indigo-500/20 rounded-xl space-y-1">
                            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider block">
                              Adaptive Follow-up Question Triggered
                            </span>
                            <p className="text-sm text-indigo-100 font-medium">
                              "{q.recommended_follow_up}"
                            </p>
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: AI Synthesis & Actionable Next Steps */}
          {report.summary_feedback && (
            <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">AI Synthesis & Personalized Coaching Feedback</h3>
                  <p className="text-xs text-slate-400">
                    Comprehensive performance evaluation across technical reasoning and interview delivery.
                  </p>
                </div>
              </div>

              <div className="p-5 bg-slate-950/60 border border-slate-800/80 rounded-xl">
                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line font-normal">
                  {report.summary_feedback}
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-slate-400">
                  Ready to practice another role or dive deeper into machine learning system design?
                </p>
                <Link
                  href="/dashboard/interviews/new"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/25 transition-colors flex items-center gap-2 shrink-0"
                >
                  Start Next Mock Interview <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { api } from "@/lib/api";
import { UploadedVideo, Transcript, TranscriptSegment, Evaluation } from "@/types";
import {
  Video,
  Play,
  Pause,
  Award,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Edit3,
  Check,
  RotateCcw,
  Volume2,
  ArrowRight,
  HelpCircle,
  Loader2,
  Maximize2,
} from "lucide-react";

export default function EvaluateWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;

  const videoRef = useRef<HTMLVideoElement>(null);

  const [video, setVideo] = useState<UploadedVideo | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);

  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [savingTranscript, setSavingTranscript] = useState(false);

  const [evaluating, setEvaluating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial data loading
  useEffect(() => {
    async function loadWorkspace() {
      try {
        setLoading(true);
        // 1. Fetch video details
        const videoData = await api.getVideo(videoId);
        setVideo(videoData);

        // 2. Fetch or generate transcript
        let transcriptData: Transcript;
        try {
          transcriptData = await api.getTranscript(videoId);
        } catch {
          // If transcript not yet generated, trigger generation
          transcriptData = await api.generateTranscript(videoId);
        }
        setTranscript(transcriptData);
        setEditedText(transcriptData.full_text);

        // 3. Check for existing evaluation
        if (videoData.question_id) {
          try {
            const evalData = await api.getEvaluationForQuestion(videoData.question_id);
            setEvaluation(evalData);
          } catch {}
        }
      } catch (err: any) {
        setError(err.message || "Failed to load interview workspace.");
      } finally {
        setLoading(false);
      }
    }
    loadWorkspace();
  }, [videoId]);

  // Video time synchronization
  const handleTimeUpdate = () => {
    if (!videoRef.current || !transcript) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    // Find active segment
    const segIdx = transcript.segments.findIndex(
      (s) => time >= s.start_time && time <= s.end_time
    );
    if (segIdx !== -1) {
      setActiveSegmentIndex(segIdx);
    }
  };

  const handleSeekToSegment = (startTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = startTime;
      videoRef.current.play();
    }
  };

  const handleSaveTranscript = async () => {
    if (!transcript) return;
    setSavingTranscript(true);
    try {
      const updated = await api.updateTranscript(transcript.id, editedText);
      setTranscript(updated);
      setIsEditingTranscript(false);
      // Mark evaluation as stale if present
      if (evaluation) {
        setEvaluation({ ...evaluation, is_stale: true });
      }
    } catch (err: any) {
      alert("Failed to update transcript: " + err.message);
    } finally {
      setSavingTranscript(false);
    }
  };

  const handleRunEvaluation = async () => {
    if (!video) return;
    setEvaluating(true);
    try {
      // Mock question fallback ID if video wasn't linked to a DB question
      const questionId = video.question_id || "default_ml_question_id";

      // If question does not exist in DB, evaluate directly with candidate answer
      const evalData = await api.evaluateAnswer({
        questionId: questionId,
        videoId: video.id,
        candidateAnswer: transcript?.full_text,
      });
      setEvaluation(evalData);
    } catch (err: any) {
      alert("Evaluation failed: " + err.message);
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  const speaking = evaluation?.speaking_metrics;

  return (
    <div className="flex flex-1">
      <Sidebar />
      <div className="flex-1 p-6 lg:p-8 max-w-7xl space-y-8">
        {/* Workspace Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Phase 3: Interactive Analysis Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Interview Response Evaluation
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Synchronized video timeline, timestamped transcript segments, acoustic speaking metrics, and rubric grading.
            </p>
          </div>

          {!evaluation && (
            <button
              onClick={handleRunEvaluation}
              disabled={evaluating}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              {evaluating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Award className="h-4 w-4" />
              )}
              <span>{evaluating ? "Evaluating Answer..." : "Run Rubric Evaluation"}</span>
            </button>
          )}
        </div>

        {/* Stale Warning Banner */}
        {evaluation?.is_stale && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3 text-amber-300 text-sm">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>
                Transcript was modified after scoring. This evaluation is now marked stale.
              </span>
            </div>
            <button
              onClick={handleRunEvaluation}
              disabled={evaluating}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-semibold text-xs hover:bg-amber-400 transition"
            >
              Re-evaluate Answer
            </button>
          </div>
        )}

        {/* Video Player & Timestamped Transcript Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Video Player */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                <Video className="h-4 w-4 text-blue-400" />
                <span>Recorded Response</span>
              </h3>
              <span className="text-xs font-mono text-slate-400">
                {currentTime.toFixed(1)}s / {video?.duration_seconds?.toFixed(1) || 0}s
              </span>
            </div>

            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center">
              <video
                ref={videoRef}
                controls
                onTimeUpdate={handleTimeUpdate}
                src={api.getVideoStreamUrl(videoId)}
                className="w-full h-full object-contain"
              >
                Browser does not support video streaming.
              </video>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
              <span>Click any transcript segment on the right to jump directly to that point.</span>
            </div>
          </div>

          {/* Right: Timestamped Transcript */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-semibold text-white">Timestamped Transcript</h3>
                {transcript?.is_user_edited && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Candidate Edited
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsEditingTranscript(!isEditingTranscript)}
                className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-md hover:bg-slate-800 transition"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>{isEditingTranscript ? "Cancel Edit" : "Edit Text"}</span>
              </button>
            </div>

            {isEditingTranscript ? (
              <div className="flex-1 flex flex-col space-y-3">
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="flex-1 min-h-[220px] w-full p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Correct transcription mistakes..."
                />
                <button
                  onClick={handleSaveTranscript}
                  disabled={savingTranscript}
                  className="self-end inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{savingTranscript ? "Saving..." : "Save Corrections"}</span>
                </button>
              </div>
            ) : (
              <div className="flex-1 max-h-[340px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {transcript?.segments.map((seg, idx) => {
                  const isActive = activeSegmentIndex === idx;
                  return (
                    <div
                      key={seg.id || idx}
                      onClick={() => handleSeekToSegment(seg.start_time)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-start space-x-3 ${
                        isActive
                          ? "bg-blue-600/15 border-blue-500/50 text-white shadow-sm"
                          : "bg-slate-800/30 border-slate-800/80 hover:bg-slate-800/70 text-slate-300"
                      }`}
                    >
                      <span className="font-mono text-[11px] font-semibold text-blue-400 shrink-0 pt-0.5">
                        [{Math.floor(seg.start_time / 60)}:
                        {String(Math.floor(seg.start_time % 60)).padStart(2, "0")}]
                      </span>
                      <p className="leading-relaxed flex-1">{seg.text}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Rubric Evaluation Report Section */}
        {evaluation && (
          <div className="space-y-6 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Answer Evaluation Report
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Model: {evaluation.model_name} • Rubric Version: {evaluation.rubric_version}
                </p>
              </div>

              {/* Overall Score Gauge */}
              <div className="flex items-center space-x-3 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Overall Score
                </span>
                <span className="text-2xl font-extrabold text-emerald-400">
                  {evaluation.overall_score}
                </span>
                <span className="text-xs text-slate-500 font-medium">/ 5.0</span>
              </div>
            </div>

            {/* Speaking Acoustics Cards */}
            {speaking && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[11px] text-slate-400 mb-1">Words Per Minute</div>
                  <div className="text-xl font-bold text-white">
                    {speaking.words_per_minute} <span className="text-xs text-slate-500">WPM</span>
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-1">
                    {speaking.words_per_minute >= 110 && speaking.words_per_minute <= 160
                      ? "Optimal delivery pace"
                      : "Pacing variation detected"}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[11px] text-slate-400 mb-1">Filler Words Detected</div>
                  <div className="text-xl font-bold text-white">
                    {speaking.filler_words_detected}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {speaking.filler_words_per_minute} fillers / min
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[11px] text-slate-400 mb-1">Silence Ratio</div>
                  <div className="text-xl font-bold text-white">
                    {(speaking.silence_ratio * 100).toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Pause freq: {speaking.pause_frequency} / min
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[11px] text-slate-400 mb-1">Long Pauses (&gt;1.5s)</div>
                  <div className="text-xl font-bold text-white">
                    {speaking.long_pause_duration}s
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Total hesitation time
                  </div>
                </div>
              </div>
            )}

            {/* Strengths & Missing Concepts Side-by-Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Strengths */}
              <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                <h4 className="text-sm font-semibold text-emerald-400 flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Demonstrated Competencies ({evaluation.strengths.length})</span>
                </h4>
                <ul className="space-y-2 text-xs text-slate-300">
                  {evaluation.strengths.map((s, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-emerald-500 font-bold shrink-0">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Missing Concepts */}
              <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                <h4 className="text-sm font-semibold text-amber-400 flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Knowledge Gaps & Omissions ({evaluation.missing_concepts.length})</span>
                </h4>
                <ul className="space-y-2 text-xs text-slate-300">
                  {evaluation.missing_concepts.map((m, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-amber-500 font-bold shrink-0">•</span>
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Criteria Breakdown Cards */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
              <h3 className="text-base font-semibold text-white">Detailed Criteria Breakdown</h3>
              <div className="space-y-3">
                {evaluation.criteria_scores.map((crit) => (
                  <div
                    key={crit.name}
                    className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 max-w-xl">
                      <div className="font-semibold text-white capitalize">
                        {crit.name.replace(/_/g, " ")}
                      </div>
                      <p className="text-slate-400">{crit.feedback}</p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-base font-bold text-blue-400">{crit.score}</span>
                      <span className="text-slate-500">/ {crit.maximum_score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Adaptive Follow-Up Question */}
            {evaluation.recommended_follow_up && (
              <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/60 to-purple-950/60 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 max-w-2xl">
                  <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Recommended Adaptive Follow-Up</span>
                  </div>
                  <h4 className="text-base font-semibold text-white">
                    "{evaluation.recommended_follow_up}"
                  </h4>
                  <p className="text-xs text-slate-400">
                    Generated dynamically to probe the knowledge gap identified in your explanation.
                  </p>
                </div>

                <button
                  onClick={() => router.push("/dashboard/interviews/upload")}
                  className="shrink-0 inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition shadow-lg shadow-blue-500/20"
                >
                  <span>Practice This Follow-Up</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

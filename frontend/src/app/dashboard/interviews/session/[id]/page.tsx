"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { api } from "@/lib/api";
import { InterviewSession, Question, TurnResponse } from "@/types";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Award,
  Clock,
  RotateCcw,
  Check,
  Send,
  Loader2,
  HelpCircle,
  TrendingUp,
} from "lucide-react";

export default function StatefulInterviewSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<InterviewSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [candidateAnswer, setCandidateAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastTurnResult, setLastTurnResult] = useState<TurnResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSession() {
      try {
        setLoading(true);
        const data = await api.getSession(sessionId);
        setSession(data);
        if (data.questions && data.questions.length > 0) {
          // Current active question is the latest one
          setCurrentQuestion(data.questions[data.questions.length - 1]);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load interview session.");
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, [sessionId]);

  const handleSubmitAnswer = async () => {
    if (!candidateAnswer.trim() || !currentQuestion) return;
    setSubmitting(true);
    setError(null);

    try {
      const turnResult = await api.submitAnswerAndProgress(sessionId, {
        questionId: currentQuestion.id,
        candidateAnswer: candidateAnswer.trim(),
      });
      setLastTurnResult(turnResult);
      setCandidateAnswer("");

      if (turnResult.session_status === "completed") {
        setSession((prev) =>
          prev
            ? {
                ...prev,
                status: "completed",
                summary_feedback: turnResult.summary_feedback,
              }
            : null
        );
      } else if (turnResult.next_question) {
        setCurrentQuestion(turnResult.next_question);
        setSession((prev) =>
          prev
            ? {
                ...prev,
                current_question_index: turnResult.current_question_index,
              }
            : null
        );
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit answer.");
    } finally {
      setSubmitting(false);
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

  const isCompleted = session?.status === "completed";
  const progressPercent = session
    ? Math.min(
        100,
        Math.round((session.current_question_index / session.question_budget) * 100)
      )
    : 0;

  return (
    <div className="flex flex-1">
      <Sidebar />
      <div className="flex-1 p-6 lg:p-8 max-w-5xl space-y-8">
        {/* Session Header & Budget Progress */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2 text-xs text-blue-400 font-medium mb-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="uppercase tracking-wider">
                  {session?.category.replace(/_/g, " ")} • {session?.difficulty} level
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {session?.title}
              </h1>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-xs text-slate-400 font-mono">
                Question {session?.current_question_index || 0} of {session?.question_budget || 0}
              </span>
              <span className="text-sm font-bold text-blue-400">{progressPercent}%</span>
            </div>
          </div>

          {/* Turn Budget Bar */}
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* COMPLETED STATE: Summary Feedback View */}
        {isCompleted ? (
          <div className="p-8 rounded-2xl bg-gradient-to-br from-slate-900/90 to-blue-950/40 border border-blue-500/30 space-y-6">
            <div className="flex items-center space-x-3 text-emerald-400">
              <Award className="h-8 w-8" />
              <div>
                <h2 className="text-2xl font-bold text-white">Interview Session Completed</h2>
                <p className="text-xs text-slate-400">
                  All question turns evaluated across the target rubric.
                </p>
              </div>
            </div>

            {/* Performance Synthesis */}
            <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                Overall Session Synthesis & Practice Priorities
              </h3>
              <pre className="text-xs text-slate-300 font-sans whitespace-pre-wrap leading-relaxed">
                {session?.summary_feedback || lastTurnResult?.summary_feedback}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => router.push("/dashboard")}
                className="text-xs text-slate-400 hover:text-white transition"
              >
                Return to Dashboard
              </button>
              <button
                onClick={() => router.push("/dashboard/interviews/new")}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
              >
                <span>Start New Mock Interview</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          /* ACTIVE INTERVIEW TURN */
          <div className="space-y-6">
            {/* Active Question Prompt */}
            {currentQuestion && (
              <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 capitalize">
                    {currentQuestion.question_type.replace(/_/g, " ")}
                  </span>
                  {currentQuestion.follow_up_reason && (
                    <span className="text-[11px] text-slate-400 italic">
                      • {currentQuestion.follow_up_reason}
                    </span>
                  )}
                </div>

                <h3 className="text-lg sm:text-xl font-semibold text-white leading-relaxed">
                  "{currentQuestion.question_text}"
                </h3>
              </div>
            )}

            {/* Previous Turn Feedback Teaser (if any) */}
            {lastTurnResult && (
              <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/20 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-400">
                    Previous Turn Score: {lastTurnResult.evaluation.overall_score} / 5.0
                  </span>
                  <span className="text-slate-400">
                    Remaining Budget: {lastTurnResult.remaining_budget} questions
                  </span>
                </div>
                {lastTurnResult.evaluation.missing_concepts.length > 0 && (
                  <p className="text-amber-400/90 text-[11px]">
                    Identified Gap: {lastTurnResult.evaluation.missing_concepts[0]}
                  </p>
                )}
              </div>
            )}

            {/* Answer Input */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <label className="text-xs font-semibold text-slate-300 block uppercase tracking-wider">
                Your Spoken or Written Response
              </label>

              <textarea
                value={candidateAnswer}
                onChange={(e) => setCandidateAnswer(e.target.value)}
                placeholder="Explain your approach, design decisions, trade-offs, and edge cases..."
                className="w-full min-h-[160px] p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <p className="text-xs text-slate-500">
                  Tip: Or record a video response in the{" "}
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/interviews/upload")}
                    className="text-blue-400 underline"
                  >
                    Video Pipeline
                  </button>
                  .
                </p>

                <button
                  onClick={handleSubmitAnswer}
                  disabled={submitting || !candidateAnswer.trim()}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition shadow-lg shadow-blue-600/20 disabled:opacity-40"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span>{submitting ? "Evaluating Turn..." : "Submit Answer & Progress"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

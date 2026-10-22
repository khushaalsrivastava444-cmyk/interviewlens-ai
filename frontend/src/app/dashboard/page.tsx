"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "@/components/Sidebar";
import { api } from "@/lib/api";
import { UserProfileResponse } from "@/types";
import {
  Video,
  Award,
  TrendingUp,
  Clock,
  Play,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [profileData, setProfileData] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      api
        .getProfile()
        .then((data) => setProfileData(data))
        .catch((err) => console.error("Error loading profile", err))
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const stats = profileData?.statistics;

  return (
    <div className="flex flex-1">
      <Sidebar />
      <div className="flex-1 p-6 lg:p-8 max-w-6xl space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Welcome back, {user?.full_name}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Preparing for: <span className="text-blue-400 font-medium">{user?.target_role}</span> ({user?.experience_level} level)
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard/interviews/upload")}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm shadow-md transition"
          >
            <Play className="h-4 w-4" />
            <span>Upload Mock Interview</span>
          </button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Interviews Practiced</span>
              <Video className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {stats?.total_sessions ?? 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {stats?.completed_sessions ?? 0} fully evaluated
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Average Rubric Score</span>
              <Award className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {stats?.average_score ? `${stats.average_score} / 5.0` : "N/A"}
            </div>
            <div className="text-[11px] text-emerald-500/80 mt-1">
              Deterministic rubric grading
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Domain Coverage</span>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {stats?.categories_practiced.length ?? 0} / 10
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Technical categories explored
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Speaking Pace Status</span>
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              Optimal (135 WPM)
            </div>
            <div className="text-[11px] text-amber-500/80 mt-1">
              Low filler word density
            </div>
          </div>
        </div>

        {/* Quick Launch Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl bg-gradient-to-br from-blue-950/40 to-slate-900/80 border border-blue-500/20 space-y-4">
            <div className="inline-flex px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 text-xs font-semibold">
              Adaptive Practice
            </div>
            <h3 className="text-lg font-semibold text-white">
              Start ML & Systems Mock Interview
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Experience dynamic follow-ups based on the technical gaps in your answers. Record your response, inspect the timestamped transcript, and get immediate criterion scoring.
            </p>
            <button
              onClick={() => router.push("/dashboard/interviews/upload")}
              className="inline-flex items-center space-x-2 text-sm font-medium text-blue-400 hover:text-blue-300"
            >
              <span>Upload response video</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6 rounded-xl bg-gradient-to-br from-purple-950/40 to-slate-900/80 border border-purple-500/20 space-y-4">
            <div className="inline-flex px-2.5 py-1 rounded bg-purple-500/10 text-purple-400 text-xs font-semibold">
              Resume Intelligence
            </div>
            <h3 className="text-lg font-semibold text-white">
              Parse Resume & Job Description
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Upload your engineering resume to extract verified skills and defense questions tailored to your actual listed projects and technologies.
            </p>
            <button
              onClick={() => router.push("/dashboard/resume")}
              className="inline-flex items-center space-x-2 text-sm font-medium text-purple-400 hover:text-purple-300"
            >
              <span>Upload and analyze resume</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

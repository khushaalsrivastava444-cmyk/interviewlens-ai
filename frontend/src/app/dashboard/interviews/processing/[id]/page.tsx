"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { api } from "@/lib/api";
import { VideoStatus, UploadedVideo } from "@/types";
import {
  Video,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Clock,
  Sparkles,
  ArrowRight,
  Music,
  Maximize2,
  Layers,
  Loader2,
} from "lucide-react";

const STEPS = [
  { id: "validating", label: "Media Ingestion & Validation", minPercent: 15 },
  { id: "metadata", label: "FFprobe Stream & Format Inspection", minPercent: 35 },
  { id: "audio", label: "FFmpeg 16kHz Audio Extraction", minPercent: 65 },
  { id: "thumbnail", label: "OpenCV Frame Quality & Thumbnail Sampling", minPercent: 85 },
  { id: "ready", label: "Ready for Transcription & Rubric Evaluation", minPercent: 100 },
];

export default function VideoProcessingPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;

  const [videoStatus, setVideoStatus] = useState<VideoStatus | null>(null);
  const [videoDetails, setVideoDetails] = useState<UploadedVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll video status every 1.5 seconds until completed or failed
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchStatus = async () => {
      try {
        const status = await api.getVideoStatus(videoId);
        setVideoStatus(status);
        setLoading(false);

        if (status.status === "completed") {
          // Fetch full metadata
          const details = await api.getVideo(videoId);
          setVideoDetails(details);
          clearInterval(intervalId);
        } else if (status.status === "failed") {
          clearInterval(intervalId);
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch video processing status.");
        clearInterval(intervalId);
        setLoading(false);
      }
    };

    fetchStatus();
    intervalId = setInterval(fetchStatus, 1500);

    return () => clearInterval(intervalId);
  }, [videoId]);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const res = await api.retryVideo(videoId);
      setVideoStatus(res);
      // Restart polling
      router.refresh();
    } catch (err: any) {
      alert("Retry failed: " + err.message);
    } finally {
      setRetrying(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this video recording?")) return;
    setDeleting(true);
    try {
      await api.deleteVideo(videoId);
      router.push("/dashboard");
    } catch (err: any) {
      alert("Delete failed: " + err.message);
      setDeleting(false);
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

  const isCompleted = videoStatus?.status === "completed";
  const isFailed = videoStatus?.status === "failed";
  const percent = videoStatus?.progress_percent || 0;

  return (
    <div className="flex flex-1">
      <Sidebar />
      <div className="flex-1 p-6 lg:p-8 max-w-5xl space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Background Media Processing</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {isCompleted
                ? "Video Ingestion & Extraction Complete"
                : isFailed
                ? "Processing Interrupted"
                : "Processing Interview Response..."}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Job ID: <span className="font-mono text-xs text-slate-300">{videoId}</span>
            </p>
          </div>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="self-start inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/20 transition disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Media</span>
          </button>
        </div>

        {/* Progress Bar Container */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm font-semibold text-white capitalize">
                Step: {videoStatus?.current_step.replace(/_/g, " ")}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {isCompleted
                  ? "All media streams and frames validated"
                  : isFailed
                  ? "An error occurred during media inspection"
                  : "Running background FFprobe & FFmpeg jobs..."}
              </div>
            </div>
            <span
              className={`text-lg font-bold ${
                isCompleted
                  ? "text-emerald-400"
                  : isFailed
                  ? "text-red-400"
                  : "text-blue-400"
              }`}
            >
              {percent}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                isCompleted
                  ? "bg-emerald-500"
                  : isFailed
                  ? "bg-red-500"
                  : "bg-blue-600"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>

          {/* Checklist steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
            {STEPS.map((step, idx) => {
              const done = percent >= step.minPercent;
              const active = !done && (idx === 0 || percent >= STEPS[idx - 1].minPercent);
              return (
                <div
                  key={step.id}
                  className={`p-3 rounded-xl border text-xs space-y-1.5 transition ${
                    done
                      ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-300"
                      : active && !isFailed
                      ? "bg-blue-500/5 border-blue-500/30 text-blue-300"
                      : "bg-slate-900/40 border-slate-800/80 text-slate-500"
                  }`}
                >
                  <div className="flex items-center space-x-1.5 font-medium">
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : active && !isFailed ? (
                      <Clock className="h-4 w-4 text-blue-400 animate-spin shrink-0" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border border-slate-700 flex items-center justify-center text-[10px] shrink-0">
                        {idx + 1}
                      </span>
                    )}
                    <span className="line-clamp-1">{step.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Failed Error Message & Retry Action */}
        {isFailed && (
          <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-red-300">Processing Error</h4>
                <p className="text-xs text-red-400/90 mt-1">
                  {videoStatus?.error_message || "The video bitstream could not be decoded."}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{retrying ? "Retrying..." : "Retry Processing"}</span>
              </button>
              <button
                onClick={() => router.push("/dashboard/interviews/upload")}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
              >
                Upload Different File
              </button>
            </div>
          </div>
        )}

        {/* Completed Video Player & Metadata Card */}
        {isCompleted && videoDetails && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-6">
              <h3 className="text-base font-semibold text-white">Video Preview & Stream</h3>
              
              {/* Native HTML5 Video Player using secure authenticated stream endpoint */}
              <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center">
                <video
                  controls
                  preload="metadata"
                  className="w-full h-full object-contain"
                  src={api.getVideoStreamUrl(videoId)}
                >
                  Your browser does not support HTML5 video streaming.
                </video>
              </div>

              {/* Verified Metadata Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                  <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 mb-1">
                    <Clock className="h-3.5 w-3.5 text-blue-400" />
                    <span>Duration</span>
                  </div>
                  <div className="text-sm font-semibold text-white">
                    {videoDetails.duration_seconds ? `${videoDetails.duration_seconds} sec` : "N/A"}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                  <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 mb-1">
                    <Maximize2 className="h-3.5 w-3.5 text-purple-400" />
                    <span>Resolution</span>
                  </div>
                  <div className="text-sm font-semibold text-white">
                    {videoDetails.width && videoDetails.height
                      ? `${videoDetails.width}x${videoDetails.height}`
                      : "Standard"}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                  <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 mb-1">
                    <Layers className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Frame Rate</span>
                  </div>
                  <div className="text-sm font-semibold text-white">
                    {videoDetails.fps ? `${videoDetails.fps} FPS` : "30 FPS"}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                  <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 mb-1">
                    <Music className="h-3.5 w-3.5 text-emerald-400" />
                    <span>16kHz Audio Track</span>
                  </div>
                  <div className="text-sm font-semibold text-emerald-400">
                    {videoDetails.has_extracted_audio ? "Extracted (WAV)" : "Audio Detected"}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  onClick={() => router.push(`/dashboard/interviews/evaluate/${videoId}`)}
                  className="inline-flex items-center space-x-2 px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition shadow-lg shadow-emerald-600/20"
                >
                  <span>Proceed to Transcript & Answer Evaluation</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

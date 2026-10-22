"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { api } from "@/lib/api";
import {
  UploadCloud,
  FileVideo,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Shield,
  Clock,
  Sparkles,
} from "lucide-react";

export default function VideoUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setErrorMessage(null);
    const validExtensions = [".mp4", ".mov", ".webm", ".mkv"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!validExtensions.includes(ext)) {
      setErrorMessage(`Unsupported format '${ext}'. Please upload an MP4, MOV, WebM, or MKV video.`);
      return;
    }
    const maxBytes = 150 * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMessage("File exceeds 150 MB maximum size limit.");
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadPercent(0);
    setErrorMessage(null);

    try {
      const response = await api.uploadVideo(selectedFile, undefined, (percent) => {
        setUploadPercent(percent);
      });
      // Navigate to real-time status page
      router.push(`/dashboard/interviews/processing/${response.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || "Upload failed. Please check your connection and try again.");
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-1">
      <Sidebar />
      <div className="flex-1 p-6 lg:p-8 max-w-5xl space-y-8">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Phase 2: Video & Audio Pipeline</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Upload Interview Video Recording
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Submit your spoken technical response. Our pipeline inspects video metadata, extracts a 16kHz audio track, and prepares it for speech-to-text evaluation.
          </p>
        </div>

        {errorMessage && (
          <div className="flex items-center space-x-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Dropzone Container */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[300px] ${
            dragActive
              ? "border-blue-500 bg-blue-500/5"
              : selectedFile
              ? "border-emerald-500/50 bg-emerald-500/5"
              : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp4,.mov,.webm,.mkv,video/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />

          {selectedFile ? (
            <div className="space-y-4">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg">
                <FileVideo className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">{selectedFile.name}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for ingestion
                </p>
              </div>
              {!uploading && (
                <p className="text-xs text-blue-400 hover:underline">
                  Click to select a different video file
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                <UploadCloud className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  Drop your video file here, or click to browse
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Supports MP4, MOV, WebM, and MKV (up to 150 MB)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Upload Progress Bar */}
        {uploading && (
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium flex items-center space-x-2">
                <Clock className="h-3.5 w-3.5 text-blue-400 animate-spin" />
                <span>Uploading video stream to private storage...</span>
              </span>
              <span className="text-blue-400 font-semibold">{uploadPercent}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-200"
                style={{ width: `${uploadPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Shield className="h-4 w-4 text-emerald-500" />
            <span>Private storage with SHA-256 integrity verification & user-controlled deletion</span>
          </div>

          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition shadow-lg shadow-blue-600/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>{uploading ? "Ingesting Video..." : "Upload & Analyze Video"}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

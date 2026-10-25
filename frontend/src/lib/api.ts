import {
  AuthResponse,
  User,
  UserProfileResponse,
  UploadedVideo,
  VideoStatus,
} from "@/types";

/**
 * Resolves the backend API base URL dynamically.
 * - Runtime in Server Functions (SSR / Route Handlers): uses BACKEND_SERVICE_URL binding injected by Vercel.
 * - In the browser: defaults to relative `/api/v1` (routed via Vercel service rewrite)
 *   or NEXT_PUBLIC_API_URL if configured.
 * - In local development: falls back to http://127.0.0.1:8000/api/v1.
 */
export function getApiBaseUrl(): string {
  // Runtime in Server Functions: use Vercel service binding if present
  if (typeof window === "undefined") {
    if (process.env.BACKEND_SERVICE_URL) {
      return `${process.env.BACKEND_SERVICE_URL.replace(/\/+$/, "")}/api/v1`;
    }
    if (process.env.BACKEND_INTERNAL_URL) {
      return `${process.env.BACKEND_INTERNAL_URL.replace(/\/+$/, "")}/api/v1`;
    }
  }

  // If explicit public API URL is configured (e.g. external backend or custom host)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
  }

  // In browser under Vercel multi-service routing, the API is mounted at /api/v1 on the same origin
  if (typeof window !== "undefined") {
    return "/api/v1";
  }

  // Fallback for local development or node scripts
  return "http://127.0.0.1:8000/api/v1";
}

class ApiClient {
  private get baseUrl(): string {
    return getApiBaseUrl();
  }
  private getHeaders(isJson: boolean = true): HeadersInit {
    const headers: Record<string, string> = {};
    if (isJson) {
      headers["Content-Type"] = "application/json";
    }
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("interviewlens_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
      let errorMessage = `HTTP error ${res.status}`;
      try {
        const errorData = await res.json();
        errorMessage = errorData.detail || errorMessage;
      } catch {
        // fallback
      }
      throw new Error(errorMessage);
    }
    if (res.status === 204) {
      return {} as T;
    }
    return res.json();
  }

  setToken(token: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem("interviewlens_token", token);
    }
  }

  clearToken() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("interviewlens_token");
    }
  }

  getToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("interviewlens_token");
    }
    return null;
  }

  getVideoStreamUrl(videoId: string): string {
    return `${this.baseUrl}/videos/${videoId}/stream`;
  }

  getVideoThumbnailUrl(videoId: string): string {
    return `${this.baseUrl}/videos/${videoId}/thumbnail`;
  }

  async healthCheck(): Promise<{ status: string; service: string }> {
    const res = await fetch(`${this.baseUrl}/health`);
    return this.handleResponse(res);
  }

  async register(data: {
    email: string;
    password: string;
    full_name: string;
    target_role: string;
    experience_level: string;
  }): Promise<AuthResponse> {
    const res = await fetch(`${this.baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await this.handleResponse<AuthResponse>(res);
    this.setToken(result.access_token);
    return result;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${this.baseUrl}/auth/login-json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const result = await this.handleResponse<AuthResponse>(res);
    this.setToken(result.access_token);
    return result;
  }

  async getMe(): Promise<User> {
    const res = await fetch(`${this.baseUrl}/auth/me`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<User>(res);
  }

  async getProfile(): Promise<UserProfileResponse> {
    const res = await fetch(`${this.baseUrl}/users/profile`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<UserProfileResponse>(res);
  }

  async updateProfile(data: {
    full_name?: string;
    target_role?: string;
    experience_level?: string;
    password?: string;
  }): Promise<User> {
    const res = await fetch(`${this.baseUrl}/users/profile`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<User>(res);
  }

  // --- Phase 2: Video Upload and Processing Services ---

  uploadVideo(
    file: File,
    questionId?: string,
    onProgress?: (percent: number) => void
  ): Promise<VideoStatus> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("file", file);
      if (questionId) {
        formData.append("question_id", questionId);
      }

      xhr.open("POST", `${this.baseUrl}/videos/upload`);
      const token = this.getToken();
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            onProgress(percentComplete);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const parsed = JSON.parse(xhr.responseText);
            resolve(parsed);
          } catch (e) {
            reject(new Error("Invalid response format from server."));
          }
        } else {
          let msg = `Upload failed with HTTP ${xhr.status}`;
          try {
            const err = JSON.parse(xhr.responseText);
            msg = err.detail || msg;
          } catch {}
          reject(new Error(msg));
        }
      };

      xhr.onerror = () => {
        reject(new Error("Network error during video upload."));
      };

      xhr.send(formData);
    });
  }

  async getVideo(videoId: string): Promise<UploadedVideo> {
    const res = await fetch(`${this.baseUrl}/videos/${videoId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<UploadedVideo>(res);
  }

  async getVideoStatus(videoId: string): Promise<VideoStatus> {
    const res = await fetch(`${this.baseUrl}/videos/${videoId}/status`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<VideoStatus>(res);
  }

  async retryVideo(videoId: string): Promise<VideoStatus> {
    const res = await fetch(`${this.baseUrl}/videos/${videoId}/retry`, {
      method: "POST",
      headers: this.getHeaders(),
    });
    return this.handleResponse<VideoStatus>(res);
  }

  async deleteVideo(videoId: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/videos/${videoId}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    return this.handleResponse<void>(res);
  }

  async getUserVideos(): Promise<UploadedVideo[]> {
    const res = await fetch(`${this.baseUrl}/videos`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<UploadedVideo[]>(res);
  }

  // --- Phase 3: Transcription and Rubric Answer Evaluation Services ---

  async generateTranscript(videoId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/transcripts/generate/${videoId}`, {
      method: "POST",
      headers: this.getHeaders(),
    });
    return this.handleResponse<any>(res);
  }

  async getTranscript(videoId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/transcripts/${videoId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<any>(res);
  }

  async updateTranscript(transcriptId: string, fullText: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/transcripts/${transcriptId}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify({ full_text: fullText }),
    });
    return this.handleResponse<any>(res);
  }

  async evaluateAnswer(data: {
    questionId: string;
    sessionId?: string;
    videoId?: string;
    candidateAnswer?: string;
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/evaluations/evaluate`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        question_id: data.questionId,
        session_id: data.sessionId,
        video_id: data.videoId,
        candidate_answer: data.candidateAnswer,
      }),
    });
    return this.handleResponse<any>(res);
  }

  async getEvaluation(evaluationId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/evaluations/${evaluationId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<any>(res);
  }

  async getEvaluationForQuestion(questionId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/evaluations/question/${questionId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<any>(res);
  }

  // --- Phase 4: Stateful Adaptive Interview Sessions ---

  async createSession(data: {
    title: string;
    category: string;
    difficulty: string;
    targetRole: string;
    questionBudget: number;
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/interviews/sessions`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        title: data.title,
        category: data.category,
        difficulty: data.difficulty,
        target_role: data.targetRole,
        question_budget: data.questionBudget,
      }),
    });
    return this.handleResponse<any>(res);
  }

  async getSessions(): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/interviews/sessions`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<any[]>(res);
  }

  async getSession(sessionId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/interviews/sessions/${sessionId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<any>(res);
  }

  async submitAnswerAndProgress(
    sessionId: string,
    data: {
      questionId: string;
      videoId?: string;
      candidateAnswer?: string;
    }
  ): Promise<any> {
    const res = await fetch(`${this.baseUrl}/interviews/sessions/${sessionId}/answer`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        question_id: data.questionId,
        video_id: data.videoId,
        candidate_answer: data.candidateAnswer,
      }),
    });
    return this.handleResponse<any>(res);
  }

  async completeSession(sessionId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/interviews/sessions/${sessionId}/complete`, {
      method: "POST",
      headers: this.getHeaders(),
    });
    return this.handleResponse<any>(res);
  }

  // --- Phase 5: Consolidated Evidence-Based Session Report ---

  async getSessionReport(sessionId: string): Promise<import("@/types").SessionReport> {
    const res = await fetch(`${this.baseUrl}/evaluations/session/${sessionId}/report`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<import("@/types").SessionReport>(res);
  }

  // --- Phase 6: Resume Intelligence & Job Description Alignment ---

  async uploadResume(file: File): Promise<import("@/types").Resume> {
    const formData = new FormData();
    formData.append("file", file);

    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${this.baseUrl}/resumes/upload`, {
      method: "POST",
      headers,
      body: formData,
    });
    return this.handleResponse<import("@/types").Resume>(res);
  }

  async getLatestResume(): Promise<import("@/types").Resume> {
    const res = await fetch(`${this.baseUrl}/resumes/latest`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<import("@/types").Resume>(res);
  }

  async getResume(resumeId: string): Promise<import("@/types").Resume> {
    const res = await fetch(`${this.baseUrl}/resumes/${resumeId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<import("@/types").Resume>(res);
  }

  async matchJobDescription(
    resumeId: string,
    data: { job_description_text: string; target_role?: string }
  ): Promise<import("@/types").JobDescriptionMatchResponse> {
    const res = await fetch(`${this.baseUrl}/resumes/${resumeId}/match-jd`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<import("@/types").JobDescriptionMatchResponse>(res);
  }

  async getProjectDefenseQuestions(
    resumeId: string
  ): Promise<import("@/types").ProjectDefenseResponse> {
    const res = await fetch(`${this.baseUrl}/resumes/${resumeId}/project-defense-questions`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<import("@/types").ProjectDefenseResponse>(res);
  }

  async generatePracticePlan(
    resumeId: string,
    data: { target_role: string; job_description_text?: string; session_id?: string }
  ): Promise<import("@/types").LearningPlan> {
    const res = await fetch(`${this.baseUrl}/resumes/${resumeId}/generate-practice-plan`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<import("@/types").LearningPlan>(res);
  }

  async getPracticePlans(): Promise<import("@/types").LearningPlan[]> {
    const res = await fetch(`${this.baseUrl}/resumes/practice-plans/all`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<import("@/types").LearningPlan[]>(res);
  }

  async getPracticePlan(planId: string): Promise<import("@/types").LearningPlan> {
    const res = await fetch(`${this.baseUrl}/resumes/practice-plans/${planId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<import("@/types").LearningPlan>(res);
  }

  // --- Phase 7: RAG Semantic Retrieval & Benchmark Evaluation ---

  async retrieveKnowledge(
    query: string,
    category?: string,
    topK: number = 3
  ): Promise<import("@/types").RetrievalResult[]> {
    const res = await fetch(`${this.baseUrl}/rag/retrieve`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        query,
        category: category && category !== "all" ? category : undefined,
        top_k: topK,
      }),
    });
    return this.handleResponse<import("@/types").RetrievalResult[]>(res);
  }

  async getKnowledgeCorpus(): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/rag/knowledge-corpus`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<any[]>(res);
  }

  async groundAnswer(
    candidateAnswer: string,
    questionText: string,
    category: string
  ): Promise<import("@/types").GroundingEvaluation> {
    const res = await fetch(`${this.baseUrl}/rag/ground`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        candidate_answer: candidateAnswer,
        question_text: questionText,
        category,
      }),
    });
    return this.handleResponse<import("@/types").GroundingEvaluation>(res);
  }

  async runBenchmark(): Promise<import("@/types").BenchmarkRunResult> {
    const res = await fetch(`${this.baseUrl}/rag/benchmark-run`, {
      method: "POST",
      headers: this.getHeaders(),
    });
    return this.handleResponse<import("@/types").BenchmarkRunResult>(res);
  }
}

export const api = new ApiClient();

export const API_BASE_URL = getApiBaseUrl();

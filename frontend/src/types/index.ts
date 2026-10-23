export interface User {
  id: string;
  email: string;
  full_name: string;
  target_role: string;
  experience_level: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface UserStatistics {
  total_sessions: number;
  completed_sessions: number;
  average_score: number;
  categories_practiced: string[];
}

export interface UserProfileResponse {
  user: User;
  statistics: UserStatistics;
}

export interface ProcessingJob {
  id: string;
  video_id: string;
  job_type: string;
  status: "pending" | "processing" | "completed" | "failed";
  current_step: string;
  progress_percent: number;
  error_detail?: string;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface VideoStatus {
  id: string;
  status: "uploaded" | "processing" | "completed" | "failed";
  current_step: string;
  progress_percent: number;
  has_audio: boolean;
  duration_seconds?: number;
  error_message?: string;
  retry_count: number;
}

export interface UploadedVideo {
  id: string;
  user_id: string;
  question_id?: string;
  filename: string;
  original_filename: string;
  file_size_bytes: number;
  duration_seconds?: number;
  mime_type: string;
  fps?: number;
  width?: number;
  height?: number;
  has_audio: boolean;
  has_thumbnail: boolean;
  has_extracted_audio: boolean;
  status: "uploaded" | "processing" | "completed" | "failed";
  current_step: string;
  progress_percent: number;
  retry_count: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
  jobs: ProcessingJob[];
}

export interface TurnResponse {
  evaluation: Evaluation;
  next_question?: Question;
  session_status: "in_progress" | "completed";
  current_question_index: number;
  remaining_budget: number;
  summary_feedback?: string;
}

export interface Question {
  id: string;
  session_id: string;
  question_text: string;
  category: string;
  difficulty: string;
  question_type: string;
  expected_competencies: string[];
  rubric: Record<string, any>;
  order_index: number;
  parent_question_id?: string;
  follow_up_reason?: string;
  created_at: string;
}

export interface InterviewSession {
  id: string;
  user_id: string;
  title: string;
  category: string;
  difficulty: string;
  target_role: string;
  status: "created" | "in_progress" | "completed";
  question_budget: number;
  current_question_index: number;
  overall_score?: number;
  summary_feedback?: string;
  created_at: string;
  updated_at: string;
  questions: Question[];
}

export interface TranscriptSegment {
  id: string;
  start_time: number;
  end_time: number;
  text: string;
  confidence?: number;
  order_index: number;
}

export interface Transcript {
  id: string;
  video_id: string;
  language: string;
  full_text: string;
  confidence?: number;
  provider_name: string;
  is_user_edited: boolean;
  segments: TranscriptSegment[];
  created_at: string;
  updated_at: string;
}

export interface TimelineMarker {
  timestamp: number;
  concept: string;
  quote: string;
  marker_type: "strength" | "gap" | "hesitation";
}

export interface SpeakingMetrics {
  words_per_minute: number;
  answer_duration: number;
  filler_words_detected: number;
  filler_words_per_minute: number;
  pause_frequency: number;
  long_pause_duration: number;
  silence_ratio: number;
  filler_words_breakdown?: Record<string, number>;
  pause_count?: number;
  word_count?: number;
}

export interface CriterionScore {
  name: string;
  score: number;
  maximum_score: number;
  evidence: string[];
  feedback: string;
}

export interface Evaluation {
  id: string;
  session_id: string;
  question_id: string;
  transcript_id?: string;
  overall_score: number;
  maximum_score: number;
  strengths: string[];
  missing_concepts: string[];
  criteria_scores: CriterionScore[];
  recommended_follow_up?: string;
  speaking_metrics?: SpeakingMetrics;
  timeline_markers?: TimelineMarker[];
  model_name: string;
  rubric_version: string;
  is_stale: boolean;
  created_at: string;
}

export interface CriterionAverage {
  name: string;
  score: number;
  maximum_score: number;
  benchmark_score: number;
}

export interface QuestionEvaluationDetail {
  question_id: string;
  question_text: string;
  category: string;
  difficulty: string;
  order_index: number;
  evaluation_id?: string;
  video_id?: string;
  overall_score?: number;
  strengths: string[];
  missing_concepts: string[];
  criteria_scores: CriterionScore[];
  speaking_metrics?: SpeakingMetrics;
  timeline_markers: TimelineMarker[];
  recommended_follow_up?: string;
  candidate_answer?: string;
}

export interface SessionReport {
  session_id: string;
  title: string;
  category: string;
  difficulty: string;
  target_role?: string;
  status: "created" | "in_progress" | "completed";
  overall_score: number;
  total_questions: number;
  summary_feedback?: string;
  criteria_averages: CriterionAverage[];
  speaking_averages: {
    avg_words_per_minute: number;
    total_filler_words: number;
    avg_filler_words_per_minute: number;
    avg_pause_frequency: number;
    avg_silence_ratio: number;
    total_speaking_duration: number;
    filler_breakdown?: Record<string, number>;
  };
  aggregated_strengths: string[];
  aggregated_missing_concepts: string[];
  timeline_markers: TimelineMarker[];
  questions_evaluations: QuestionEvaluationDetail[];
  created_at: string;
}

// --- Phase 6: Resume Intelligence & Job Description Alignment Types ---

export interface ParsedProject {
  name: string;
  description: string;
  technologies: string[];
  metrics: string[];
  highlights: string[];
}

export interface ParsedExperience {
  title: string;
  company?: string;
  duration?: string;
  responsibilities: string[];
}

export interface ParsedEducation {
  degree: string;
  institution?: string;
  year?: string;
}

export interface Resume {
  id: string;
  user_id: string;
  filename: string;
  extracted_text: string;
  parsed_skills: string[];
  skills_by_category: Record<string, string[]>;
  parsed_projects: ParsedProject[];
  parsed_experience: ParsedExperience[];
  parsed_education: ParsedEducation[];
  created_at: string;
}

export interface JobDescriptionMatchResponse {
  match_score: number;
  matched_skills: string[];
  missing_critical_skills: string[];
  preferred_skills_found: string[];
  ats_recommendations: string[];
  recommended_interview_categories: string[];
}

export interface ProjectDefenseQuestion {
  id: string;
  project_name: string;
  question_text: string;
  technical_focus: string;
  sample_expected_topics: string[];
}

export interface ProjectDefenseResponse {
  resume_id: string;
  candidate_name?: string;
  questions: ProjectDefenseQuestion[];
}

export interface LearningMilestone {
  phase: string;
  title: string;
  focus_areas: string[];
  recommended_practice: string;
}

export interface LearningPlan {
  id: string;
  user_id: string;
  session_id?: string;
  target_role: string;
  identified_gaps: string[];
  recommended_topics: string[];
  practice_questions: {
    topic: string;
    question: string;
    difficulty: string;
  }[];
  milestones: LearningMilestone[];
  created_at: string;
}

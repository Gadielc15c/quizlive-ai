export type UserRole = "admin" | "teacher" | "student";

export interface AuthUser {
  sub: string;
  role: UserRole;
  institutionId: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export type QuizMode = "live" | "async";
export type QuizStatus = "draft" | "published" | "closed";

export interface RubricCriterion {
  name: string;
  weight: number;
}

export type GenerationStatus = "idle" | "processing" | "ready" | "failed";

export interface Quiz {
  _id: string;
  courseId: string;
  title: string;
  description?: string;
  mode: QuizMode;
  status: QuizStatus;
  durationMinutes: number;
  startsAt?: string;
  endsAt?: string;
  rubric?: RubricCriterion[];
  generationStatus?: GenerationStatus;
  generationError?: string;
}

export type QuestionType =
  | "multiple_choice"
  | "multiple_select"
  | "true_false"
  | "short_answer"
  | "essay"
  | "fill_blank"
  | "ordering"
  | "matching"
  | "drag_drop"
  | "matrix_scale"
  | "prompt_evaluation";

export interface QuestionOption {
  id: string;
  label: string;
}

export interface Question {
  _id: string;
  quizId: string;
  type: QuestionType;
  title: string;
  body: string;
  instructions?: string;
  points: number;
  options?: QuestionOption[];
  metadata?: Record<string, unknown>;
}

export type SessionStatus = "waiting" | "live" | "paused" | "ended";

export interface QuizSession {
  _id: string;
  quizId: string;
  sessionCode: string;
  joinToken: string;
  status: SessionStatus;
  startedAt?: string;
  endedAt?: string;
  reviewAccessEnabled?: boolean;
}

export interface JoinResult {
  participantId: string;
  sessionId: string;
  sessionStatus: SessionStatus;
}

export interface SessionQuestions {
  sessionStatus: SessionStatus;
  sessionId?: string;
  quizId?: string;
  durationMinutes?: number;
  startedAt?: string;
  questions: Question[];
}

export interface Participant {
  _id: string;
  sessionId: string;
  name: string;
  status: string;
  joinedAt?: string;
}

export interface SessionResults {
  sessionId: string;
  participants: number;
  totalQuestions?: number;
  maxScore?: number;
  summary?: {
    averagePercentage: number;
    highestPercentage: number;
    lowestPercentage: number;
    submitted: number;
    pending: number;
  };
  results: Array<{
    participantId: string;
    name?: string;
    studentCode?: string;
    status?: string;
    score: number;
    maxScore: number;
    percentage?: number;
    answers?: number;
  }>;
}

export interface LiveParticipant {
  participantId: string;
  name: string;
  status: string;
  submittedAt: string | null;
  answeredCount: number;
  progress: number;
  score?: number;
  maxScore?: number;
  percentage?: number;
}

export interface LiveProgress {
  sessionId: string;
  sessionStatus: SessionStatus;
  totalQuestions: number;
  maxScore?: number;
  averagePercentage?: number;
  participants: LiveParticipant[];
}

export interface GenerateQuizPayload {
  institutionId: string;
  courseId: string;
  title: string;
  description?: string;
  topic: string;
  quantity: number;
  difficulty?: "easy" | "medium" | "hard";
  types?: string[];
  language?: string;
  durationMinutes?: number;
  publishNow?: boolean;
}

export interface GenerateQuizResult {
  quizId: string;
  generationStatus: GenerationStatus;
  questionsCreated?: number;
}

export interface ParticipantResult {
  participantId: string;
  sessionId?: string;
  sessionStatus?: SessionStatus;
  reviewAccessEnabled?: boolean;
  score: number;
  maxScore: number;
  percentage: number;
  answers: number;
  totalQuestions?: number;
  pendingGrading: number;
  gradingComplete: boolean;
}

export interface ParticipantReviewItem {
  questionId: string;
  type: QuestionType;
  title: string;
  body: string;
  points: number;
  answer: Record<string, unknown> | null;
  score: number;
  maxScore: number;
  isCorrect: boolean | null;
  feedback?: string;
  aiInsight?: Record<string, unknown> | null;
  answered: boolean;
}

export interface ParticipantReview {
  participantId: string;
  sessionId: string;
  reviewAccessEnabled: boolean;
  items: ParticipantReviewItem[];
}

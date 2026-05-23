export interface GenerateQuestionsInput {
  topic: string;
  quantity: number;
  difficulty?: "easy" | "medium" | "hard";
  types?: string[];
  language?: string;
}

export interface GeneratedQuestion {
  type: string;
  title: string;
  body: string;
  instructions?: string;
  options?: { id: string; label: string }[];
  correctAnswer?: Record<string, unknown>;
  rubric?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  points: number;
}

export interface GenerateQuestionsOutput {
  title: string;
  description: string;
  questions: GeneratedQuestion[];
}

export interface EvaluateResponseInput {
  question: string;
  studentAnswer: string;
  rubric?: Record<string, unknown>;
  structured?: Record<string, unknown>;
}

export interface EvaluateResponseOutput {
  score: number;
  maxScore: number;
  feedback: string;
  confidence: number;
  criteria?: Record<string, number>;
  structured?: Record<string, unknown>;
}

export interface LlmProvider {
  generateQuestions(input: GenerateQuestionsInput): Promise<GenerateQuestionsOutput>;
  evaluateResponse(input: EvaluateResponseInput): Promise<EvaluateResponseOutput>;
}


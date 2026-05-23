export interface GradingInput {
  type: string;
  answer: Record<string, unknown>;
  correctAnswer?: Record<string, unknown>;
  points: number;
}

export interface GradingOutput {
  isCorrect?: boolean;
  score: number;
  maxScore: number;
  feedback: string;
  aiFeedback?: Record<string, unknown>;
}


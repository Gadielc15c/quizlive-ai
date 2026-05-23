import type {
  JoinResult,
  LoginResponse,
  Question,
  Quiz,
  QuizSession,
  SessionQuestions,
  SessionResults,
} from "./types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

const TOKEN_KEY = "quizlive_token";
const USER_KEY = "quizlive_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function setUser(user: import("./types").AuthUser) {
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser(): import("./types").AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as import("./types").AuthUser) : null;
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  if (auth) {
    const token = getToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
  });

  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const data = await res.json();
      message = Array.isArray(data.message)
        ? data.message.join(", ")
        : (data.message ?? message);
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email, password }),
    }),

  listQuizzes: () => request<Quiz[]>("/quizzes"),

  getQuiz: (id: string) => request<Quiz>(`/quizzes/${id}`),

  createQuiz: (payload: Partial<Quiz>) =>
    request<Quiz>("/quizzes", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  publishQuiz: (id: string) =>
    request<Quiz>(`/quizzes/${id}/publish`, {
      method: "POST",
      body: JSON.stringify({}),
    }),

  listQuestions: (quizId: string) =>
    request<Question[]>(`/quizzes/${quizId}/questions`),

  createQuestion: (quizId: string, payload: Partial<Question>) =>
    request<Question>(`/quizzes/${quizId}/questions`, {
      method: "POST",
      body: JSON.stringify({ ...payload, quizId }),
    }),

  deleteQuestion: (id: string) =>
    request<void>(`/questions/${id}`, { method: "DELETE" }),

  createSession: (quizId: string) =>
    request<QuizSession>(`/quizzes/${quizId}/sessions`, {
      method: "POST",
      body: JSON.stringify({}),
    }),

  getSession: (id: string) => request<QuizSession>(`/sessions/${id}`),

  startSession: (id: string) =>
    request<QuizSession>(`/sessions/${id}/start`, { method: "POST" }),

  pauseSession: (id: string) =>
    request<QuizSession>(`/sessions/${id}/pause`, { method: "POST" }),

  endSession: (id: string) =>
    request<QuizSession>(`/sessions/${id}/end`, { method: "POST" }),

  sessionParticipants: (sessionId: string) =>
    request<import("./types").Participant[]>(
      `/participant/session/${sessionId}`,
    ),

  sessionLive: (sessionId: string) =>
    request<import("./types").LiveProgress>(`/sessions/${sessionId}/live`),

  generateQuiz: (payload: import("./types").GenerateQuizPayload) =>
    request<import("./types").GenerateQuizResult>("/ai/generate-quiz", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  sessionResults: (id: string) =>
    request<SessionResults>(`/sessions/${id}/results`),

  // public (student)
  join: (token: string, name: string, email?: string) =>
    request<JoinResult>(`/join/${token}`, {
      method: "POST",
      auth: false,
      body: JSON.stringify({ name, email: email || undefined }),
    }),

  participantQuestions: (participantId: string) =>
    request<SessionQuestions>(`/participant/${participantId}/questions`, {
      auth: false,
    }),

  answer: (
    participantId: string,
    questionId: string,
    answer: Record<string, unknown>,
  ) =>
    request<unknown>(`/participant/${participantId}/answer/${questionId}`, {
      method: "POST",
      auth: false,
      body: JSON.stringify({ answer }),
    }),

  submit: (participantId: string) =>
    request<unknown>(`/participant/${participantId}/submit`, {
      method: "POST",
      auth: false,
    }),

  participantResult: (participantId: string) =>
    request<import("./types").ParticipantResult>(
      `/participant/${participantId}/result`,
      { auth: false },
    ),
};

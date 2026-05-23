import { Controller, Get } from "@nestjs/common";

@Controller("docs")
export class DocsController {
  @Get()
  getDocs() {
    return {
      service: "QuizLive AI Backend",
      health: "/api/health",
      auth: {
        login: "POST /api/auth/login",
      },
      teacher: {
        quizzes: "GET /api/quizzes",
        createQuiz: "POST /api/quizzes",
        publishQuiz: "POST /api/quizzes/:id/publish",
        createSession: "POST /api/quizzes/:id/sessions",
        sessionAccess: "GET /api/sessions/:id/access",
        sessionResults: "GET /api/sessions/:id/results",
        participants: "GET /api/participant/session/:id",
        generateQuiz: "POST /api/ai/generate-quiz",
        generateQuestionsForQuiz: "POST /api/ai/quizzes/:id/generate-questions",
      },
      student: {
        joinInfo: "GET /api/join/:token",
        join: "POST /api/join/:token",
        answer: "POST /api/participant/:id/answer",
        submit: "POST /api/participant/:id/submit",
        result: "GET /api/participant/:id/result",
      },
    };
  }
}


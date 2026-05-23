import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api");

  const httpServer = app.getHttpAdapter().getInstance() as {
    get?: (path: string, handler: unknown) => void;
  };

  if (typeof httpServer.get === "function") {
    const docsPayload = {
      service: "QuizLive AI Backend",
      health: "/api/health",
      docs: "/api/docs",
      auth: { login: "POST /api/auth/login" },
      teacher: {
        quizzes: "GET /api/quizzes",
        createQuiz: "POST /api/quizzes",
        generateQuiz: "POST /api/ai/generate-quiz",
        publishQuiz: "POST /api/quizzes/:id/publish",
        createSession: "POST /api/quizzes/:id/sessions",
        sessionAccess: "GET /api/sessions/:id/access",
      },
      student: {
        joinInfo: "GET /api/join/:token",
        join: "POST /api/join/:token",
        answer: "POST /api/participant/:id/answer",
        result: "GET /api/participant/:id/result",
      },
    };

    httpServer.get(
      "/api/docs",
      (_req: unknown, res: { type: (value: string) => unknown; send: (body: string) => void }) => {
        res.type("html");
        res.send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>QuizLive AI Backend</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; color: #0f172a; background: #f8fafc; }
      main { max-width: 760px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; }
      a { color: #0e7490; font-weight: 700; }
      code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
      pre { background: #0f172a; color: white; padding: 16px; border-radius: 8px; overflow:auto; }
    </style>
  </head>
  <body>
    <main>
      <h1>QuizLive AI Backend</h1>
      <p>Estas en la API, no en la interfaz.</p>
      <p>Abre el panel docente aqui:</p>
      <p><a href="http://localhost:3000/dashboard">http://localhost:3000/dashboard</a></p>
      <p>Crear examen:</p>
      <p><a href="http://localhost:3000/dashboard/create">http://localhost:3000/dashboard/create</a></p>
      <p>Healthcheck API: <code>/api/health</code></p>
      <pre>${JSON.stringify(docsPayload, null, 2)}</pre>
    </main>
  </body>
</html>`);
      },
    );
    httpServer.get("/docs", (_req: unknown, res: { redirect: (path: string) => void }) =>
      res.redirect("/api/docs"),
    );
    httpServer.get("/api/health", (_req: unknown, res: { json: (body: unknown) => void }) =>
      res.json({
        ok: true,
        service: "quizlive-backend",
        port: Number(process.env.PORT ?? 5000),
        dbName: process.env.DB_NAME ?? "quizlive",
        timestamp: new Date().toISOString(),
      }),
    );
    httpServer.get("/health", (_req: unknown, res: { redirect: (path: string) => void }) =>
      res.redirect("/api/health"),
    );
  }

  const allowList = process.env.CORS_ORIGIN?.split(",").map((o) => o.trim());
  app.enableCors({
    origin: (origin, callback) => {
      // Non-browser clients (curl, server-to-server) send no Origin.
      if (!origin) return callback(null, true);
      // Always allow localhost/127.0.0.1 on any port for local dev.
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      if (!allowList || allowList.length === 0 || allowList.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin not allowed by CORS: ${origin}`), false);
    },
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
}

void bootstrap();

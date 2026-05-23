import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  check() {
    return {
      ok: true,
      service: "quizlive-backend",
      port: Number(process.env.PORT ?? 5000),
      dbName: process.env.DB_NAME ?? "quizlive",
      timestamp: new Date().toISOString(),
    };
  }
}

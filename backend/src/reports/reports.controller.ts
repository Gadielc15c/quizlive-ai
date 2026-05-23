import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { ReportsService } from "./reports.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.TEACHER)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("sessions/:id/results")
  getSessionResults(@Param("id") sessionId: string) {
    return this.reportsService.getSessionResults(sessionId);
  }

  @Get("sessions/:id/live")
  getSessionLive(@Param("id") sessionId: string) {
    return this.reportsService.getSessionLive(sessionId);
  }

  @Get("quizzes/:id/results")
  getQuizResults(@Param("id") quizId: string) {
    return this.reportsService.getQuizResults(quizId);
  }
}


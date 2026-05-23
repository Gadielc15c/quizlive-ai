import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AiService } from "./ai.service";
import { EvaluateResponseDto } from "./dto/evaluate-response.dto";
import { GenerateQuizDto } from "./dto/generate-quiz.dto";
import { GenerateQuestionsDto } from "./dto/generate-questions.dto";

@Controller("ai")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.TEACHER)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("generate-questions")
  generateQuestions(
    @CurrentUser() user: { sub: string },
    @Body() dto: GenerateQuestionsDto,
  ) {
    return this.aiService.generateQuestions(user.sub, dto);
  }

  @Post("quizzes/:id/generate-questions")
  generateQuestionsForQuiz(
    @CurrentUser() user: { sub: string },
    @Param("id") quizId: string,
    @Body() dto: GenerateQuestionsDto,
  ) {
    return this.aiService.generateQuestionsForQuiz(user.sub, quizId, dto);
  }

  @Post("generate-quiz")
  generateQuiz(
    @CurrentUser() user: { sub: string },
    @Body() dto: GenerateQuizDto,
  ) {
    return this.aiService.generateQuiz(user.sub, dto);
  }

  @Post("evaluate-response")
  evaluateResponse(
    @CurrentUser() user: { sub: string },
    @Body() dto: EvaluateResponseDto,
  ) {
    return this.aiService.evaluateResponse(user.sub, dto);
  }
}

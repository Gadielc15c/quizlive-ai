import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateQuestionDto } from "./dto/create-question.dto";
import { UpdateQuestionDto } from "./dto/update-question.dto";
import { QuestionsService } from "./questions.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.TEACHER)
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post("quizzes/:id/questions")
  create(@Param("id") quizId: string, @Body() dto: CreateQuestionDto) {
    return this.questionsService.create({ ...dto, quizId });
  }

  @Get("quizzes/:id/questions")
  findByQuiz(@Param("id") quizId: string) {
    return this.questionsService.findByQuiz(quizId);
  }

  @Patch("questions/:id")
  update(@Param("id") id: string, @Body() dto: UpdateQuestionDto) {
    return this.questionsService.update(id, dto);
  }

  @Delete("questions/:id")
  remove(@Param("id") id: string) {
    return this.questionsService.remove(id);
  }
}


import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateQuizDto, QuizStatus } from "./dto/create-quiz.dto";
import { PublishQuizDto } from "./dto/publish-quiz.dto";
import { UpdateQuizDto } from "./dto/update-quiz.dto";
import { QuizzesService } from "./quizzes.service";

@Controller("quizzes")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.TEACHER)
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post()
  create(
    @Body() createQuizDto: CreateQuizDto,
    @CurrentUser() user: { sub: string; role: UserRole; institutionId: string },
  ) {
    return this.quizzesService.create(createQuizDto, user);
  }

  @Get()
  findAll(
    @CurrentUser() user: { sub: string; role: UserRole; institutionId: string },
    @Query("teacherId") teacherId?: string,
    @Query("courseId") courseId?: string,
    @Query("status") status?: QuizStatus,
  ) {
    return this.quizzesService.findAll(user, teacherId, courseId, status);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.quizzesService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateQuizDto: UpdateQuizDto) {
    return this.quizzesService.update(id, updateQuizDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.quizzesService.remove(id);
  }

  @Post(":id/publish")
  publish(@Param("id") id: string, @Body() dto: PublishQuizDto) {
    return this.quizzesService.publish(id, dto);
  }
}

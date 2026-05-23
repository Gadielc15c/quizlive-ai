import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateSessionDto } from "./dto/create-session.dto";
import { SessionsService } from "./sessions.service";

@Controller()
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post("quizzes/:id/sessions")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  create(@Param("id") quizId: string, @Body() dto: CreateSessionDto) {
    return this.sessionsService.create(quizId, dto);
  }

  @Get("sessions/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findOne(@Param("id") id: string) {
    return this.sessionsService.findOne(id);
  }

  @Get("quizzes/:id/sessions")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findByQuiz(@Param("id") quizId: string) {
    return this.sessionsService.findByQuiz(quizId);
  }

  @Post("sessions/:id/start")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  start(@Param("id") id: string) {
    return this.sessionsService.start(id);
  }

  @Post("sessions/:id/pause")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  pause(@Param("id") id: string) {
    return this.sessionsService.pause(id);
  }

  @Post("sessions/:id/end")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  end(@Param("id") id: string) {
    return this.sessionsService.end(id);
  }

  @Get("sessions/:id/access")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  getJoinAccess(@Param("id") id: string) {
    return this.sessionsService.getJoinAccess(id);
  }
}

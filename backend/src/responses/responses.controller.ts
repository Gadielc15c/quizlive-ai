import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AnswerDto } from "./dto/answer.dto";
import { ResponsesService } from "./responses.service";

@Controller()
export class ResponsesController {
  constructor(private readonly responsesService: ResponsesService) {}

  @Post("participant/:id/answer/:questionId")
  answer(
    @Param("id") participantId: string,
    @Param("questionId") questionId: string,
    @Body() dto: AnswerDto,
  ) {
    return this.responsesService.answer(participantId, questionId, dto);
  }

  @Post("participant/:id/answer")
  answerByParticipant(@Param("id") participantId: string, @Body() dto: AnswerDto) {
    return this.responsesService.answerByParticipant(participantId, dto);
  }

  @Get("participant/:id/responses")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  getByParticipant(@Param("id") participantId: string) {
    return this.responsesService.getByParticipant(participantId);
  }

  @Get("participant/:id/result")
  getParticipantResult(@Param("id") participantId: string) {
    return this.responsesService.getParticipantResult(participantId);
  }
}

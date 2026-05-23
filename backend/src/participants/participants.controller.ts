import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "../auth/auth.types";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { JoinSessionDto } from "./dto/join-session.dto";
import { ParticipantsService } from "./participants.service";

@Controller()
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Get("join/:token")
  getJoinInfo(@Param("token") token: string) {
    return this.participantsService.getJoinInfo(token);
  }

  @Post("join/:token")
  join(@Param("token") token: string, @Body() dto: JoinSessionDto) {
    return this.participantsService.join(token, dto);
  }

  @Get("participant/:id/questions")
  getQuestions(@Param("id") participantId: string) {
    return this.participantsService.getQuestions(participantId);
  }

  @Get("participant/session/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  getBySession(@Param("id") sessionId: string) {
    return this.participantsService.getBySession(sessionId);
  }

  @Post("participant/:id/heartbeat")
  heartbeat(@Param("id") participantId: string) {
    return this.participantsService.heartbeat(participantId);
  }

  @Post("participant/:id/submit")
  submit(@Param("id") participantId: string) {
    return this.participantsService.submit(participantId);
  }
}

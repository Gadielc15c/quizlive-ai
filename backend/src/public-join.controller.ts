import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { JoinSessionDto } from "./participants/dto/join-session.dto";
import { ParticipantsService } from "./participants/participants.service";

@Controller("join")
export class PublicJoinController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Get(":token")
  getJoinInfo(@Param("token") token: string) {
    return this.participantsService.getJoinInfo(token);
  }

  @Post(":token")
  join(@Param("token") token: string, @Body() dto: JoinSessionDto) {
    return this.participantsService.join(token, dto);
  }
}


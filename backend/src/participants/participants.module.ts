import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { QuestionsModule } from "../questions/questions.module";
import { SessionsModule } from "../sessions/sessions.module";
import { ParticipantsController } from "./participants.controller";
import { ParticipantsService } from "./participants.service";
import { Participant, ParticipantSchema } from "./schemas/participant.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Participant.name, schema: ParticipantSchema },
    ]),
    AuthModule,
    QuestionsModule,
    SessionsModule,
  ],
  controllers: [ParticipantsController],
  providers: [ParticipantsService],
  exports: [ParticipantsService],
})
export class ParticipantsModule {}


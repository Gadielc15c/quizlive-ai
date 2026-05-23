import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AiModule } from "../ai/ai.module";
import { AuthModule } from "../auth/auth.module";
import { GradingModule } from "../grading/grading.module";
import { Participant, ParticipantSchema } from "../participants/schemas/participant.schema";
import { QuestionsModule } from "../questions/questions.module";
import { SessionsModule } from "../sessions/sessions.module";
import { ResponsesController } from "./responses.controller";
import { ResponsesService } from "./responses.service";
import { ResponseSchema, StudentResponse } from "./schemas/response.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StudentResponse.name, schema: ResponseSchema },
      { name: Participant.name, schema: ParticipantSchema },
    ]),
    AuthModule,
    QuestionsModule,
    SessionsModule,
    GradingModule,
    AiModule,
  ],
  controllers: [ResponsesController],
  providers: [ResponsesService],
  exports: [ResponsesService],
})
export class ResponsesModule {}

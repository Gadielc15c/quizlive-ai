import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { Participant, ParticipantSchema } from "../participants/schemas/participant.schema";
import { Question, QuestionSchema } from "../questions/schemas/question.schema";
import { ResponseSchema, StudentResponse } from "../responses/schemas/response.schema";
import { SessionsModule } from "../sessions/sessions.module";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

@Module({
  imports: [
    AuthModule,
    SessionsModule,
    MongooseModule.forFeature([
      { name: Participant.name, schema: ParticipantSchema },
      { name: StudentResponse.name, schema: ResponseSchema },
      { name: Question.name, schema: QuestionSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}

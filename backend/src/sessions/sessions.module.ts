import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { Quiz, QuizSchema } from "../quizzes/schemas/quiz.schema";
import {
  QuizSession,
  QuizSessionSchema,
} from "./schemas/quiz-session.schema";
import { SessionsController } from "./sessions.controller";
import { SessionsService } from "./sessions.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: QuizSession.name, schema: QuizSessionSchema },
      { name: Quiz.name, schema: QuizSchema },
    ]),
    AuthModule,
  ],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}

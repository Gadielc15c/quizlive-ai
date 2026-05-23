import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { Question, QuestionSchema } from "../questions/schemas/question.schema";
import { Quiz, QuizSchema } from "../quizzes/schemas/quiz.schema";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { AiRequest, AiRequestSchema } from "./schemas/ai-request.schema";

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: AiRequest.name, schema: AiRequestSchema },
      { name: Quiz.name, schema: QuizSchema },
      { name: Question.name, schema: QuestionSchema },
    ]),
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}

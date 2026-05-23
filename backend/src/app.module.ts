import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { AiModule } from "./ai/ai.module";
import { AuthModule } from "./auth/auth.module";
import { DocsController } from "./docs.controller";
import { GradingModule } from "./grading/grading.module";
import { HealthController } from "./health.controller";
import { PublicJoinController } from "./public-join.controller";
import { ParticipantsModule } from "./participants/participants.module";
import { QuestionsModule } from "./questions/questions.module";
import { QuizzesModule } from "./quizzes/quizzes.module";
import { ReportsModule } from "./reports/reports.module";
import { ResponsesModule } from "./responses/responses.module";
import { SessionsModule } from "./sessions/sessions.module";
import { WebsocketModule } from "./websocket/websocket.module";

@Module({
  controllers: [HealthController, DocsController, PublicJoinController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>("MONGODB_URI", "mongodb://localhost:27017/quizlive"),
        dbName: config.get<string>("DB_NAME", "quizlive"),
      }),
    }),
    AuthModule,
    QuizzesModule,
    QuestionsModule,
    SessionsModule,
    ParticipantsModule,
    ResponsesModule,
    ReportsModule,
    GradingModule,
    AiModule,
    WebsocketModule,
  ],
})
export class AppModule {}

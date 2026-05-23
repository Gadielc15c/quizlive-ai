import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Question } from "../questions/schemas/question.schema";
import { QuizMode, QuizStatus } from "../quizzes/dto/create-quiz.dto";
import { Quiz } from "../quizzes/schemas/quiz.schema";
import { EvaluateResponseDto } from "./dto/evaluate-response.dto";
import { GenerateQuizDto } from "./dto/generate-quiz.dto";
import { GenerateQuestionsDto } from "./dto/generate-questions.dto";
import { LlmProvider } from "./ai.types";
import { MockLlmProvider } from "./providers/mock-llm.provider";
import { OpenAiCompatibleProvider } from "./providers/openai-compatible.provider";
import { AiRequest, AiRequestDocument } from "./schemas/ai-request.schema";

@Injectable()
export class AiService {
  private readonly providerName = process.env.LLM_PROVIDER ?? "mock";
  private readonly provider: LlmProvider =
    process.env.LLM_PROVIDER === "api"
      ? new OpenAiCompatibleProvider({
          baseUrl: process.env.LLM_BASE_URL ?? "https://api.openai.com/v1",
          apiKey: process.env.OPENAI_API_KEY ?? "",
          timeoutMs: Number(process.env.LLM_TIMEOUT_SECONDS ?? 60) * 1000,
          screeningModel: process.env.AI_SCREENING_MODEL ?? "gpt-4.1-mini",
          assessmentModel: process.env.AI_ASSESSMENT_MODEL ?? "gpt-4.1-mini",
        })
      : new MockLlmProvider();

  constructor(
    @InjectModel(AiRequest.name)
    private readonly aiRequestModel: Model<AiRequestDocument>,
    @InjectModel(Quiz.name)
    private readonly quizModel: Model<Record<string, unknown>>,
    @InjectModel(Question.name)
    private readonly questionModel: Model<Record<string, unknown>>,
  ) {}

  async generateQuestions(userId: string, dto: GenerateQuestionsDto) {
    const result = await this.provider.generateQuestions(dto);
    await this.audit(userId, "generate-questions", dto, result);
    return result;
  }

  async generateQuestionsForQuiz(
    userId: string,
    quizId: string,
    dto: GenerateQuestionsDto,
  ) {
    const quiz = await this.quizModel.findById(quizId).exec();
    if (!quiz) {
      throw new NotFoundException("Quiz no encontrado");
    }

    const generated = await this.provider.generateQuestions(dto);
    const questionDocs = generated.questions.map((q) => ({
      quizId,
      type: q.type,
      title: q.title,
      body: q.body,
      instructions: q.instructions,
      points: q.points ?? 5,
      options: q.options ?? [],
      correctAnswer: q.correctAnswer ?? {},
      rubric: q.rubric ?? {},
      metadata: q.metadata ?? {},
    }));

    const questions = await this.questionModel.insertMany(questionDocs);

    await this.audit(userId, "generate-questions-for-quiz", { quizId, ...dto }, {
      questionsCreated: questions.length,
      generated,
    });

    return {
      quizId,
      questionsCreated: questions.length,
      questions,
    };
  }

  async evaluateResponse(userId: string, dto: EvaluateResponseDto) {
    const result = await this.provider.evaluateResponse(dto);
    await this.audit(userId, "evaluate-response", dto, result);
    return result;
  }

  async generateQuiz(userId: string, dto: GenerateQuizDto) {
    const generated = await this.provider.generateQuestions({
      topic: dto.topic,
      quantity: dto.quantity,
      difficulty: dto.difficulty,
      types: dto.types,
      language: dto.language,
    });

    const quiz = await this.quizModel.create({
      institutionId: dto.institutionId,
      teacherId: userId,
      courseId: dto.courseId,
      title: dto.title || generated.title,
      description: dto.description || generated.description,
      mode: dto.mode ?? QuizMode.ASYNC,
      status: dto.publishNow ? QuizStatus.PUBLISHED : QuizStatus.DRAFT,
      durationMinutes: dto.durationMinutes ?? 30,
      settings: {
        randomizeQuestions: false,
        randomizeOptions: false,
        showResults: true,
        allowRetries: false,
        retries: 1,
      },
      rubric: [],
    });

    const quizId = String((quiz as unknown as { _id: unknown })._id);
    const questionDocs = generated.questions.map((q) => ({
      quizId,
      type: q.type,
      title: q.title,
      body: q.body,
      instructions: q.instructions,
      points: q.points ?? 5,
      options: q.options ?? [],
      correctAnswer: q.correctAnswer ?? {},
      rubric: q.rubric ?? {},
      metadata: q.metadata ?? {},
    }));

    const questions = await this.questionModel.insertMany(questionDocs);

    await this.audit(userId, "generate-quiz", dto, {
      quizId,
      questionsCreated: questions.length,
      generated,
    });

    return {
      quizId,
      questionsCreated: questions.length,
      generated,
    };
  }

  private audit(
    userId: string,
    taskType: string,
    payload: unknown,
    result: unknown,
  ) {
    return this.aiRequestModel.create({
      userId,
      provider: this.providerName,
      taskType,
      payload,
      result,
      status: "ok",
    });
  }
}

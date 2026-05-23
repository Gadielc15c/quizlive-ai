import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { AiService } from "../ai/ai.service";
import { GradingService } from "../grading/grading.service";
import { GradingOutput } from "../grading/grading.types";
import {
  Participant,
  ParticipantDocument,
  ParticipantStatus,
} from "../participants/schemas/participant.schema";
import { QuestionsService } from "../questions/questions.service";
import { SessionStatus } from "../sessions/schemas/quiz-session.schema";
import { SessionsService } from "../sessions/sessions.service";
import { AnswerDto } from "./dto/answer.dto";
import { ResponseDocument, StudentResponse } from "./schemas/response.schema";

@Injectable()
export class ResponsesService {
  constructor(
    @InjectModel(StudentResponse.name)
    private readonly responseModel: Model<ResponseDocument>,
    @InjectModel(Participant.name)
    private readonly participantModel: Model<ParticipantDocument>,
    private readonly questionsService: QuestionsService,
    private readonly sessionsService: SessionsService,
    private readonly gradingService: GradingService,
    private readonly aiService: AiService,
  ) {}

  async answer(participantId: string, questionId: string, dto: AnswerDto) {
    const participant = await this.participantModel.findById(participantId).exec();
    if (!participant) throw new NotFoundException("Participante no encontrado");

    if (participant.status === ParticipantStatus.SUBMITTED) {
      throw new BadRequestException("El examen ya fue entregado");
    }

    const session = await this.sessionsService.findOne(participant.sessionId);
    if (session.status !== SessionStatus.LIVE) {
      throw new BadRequestException("El examen no esta activo");
    }

    const question = await this.questionsService.findById(questionId);
    if (!question) throw new NotFoundException("Pregunta no encontrada");
    if (question.quizId !== session.quizId) {
      throw new BadRequestException("La pregunta no pertenece a esta sesion");
    }

    const q = question as unknown as {
      quizId: string;
      type: string;
      title: string;
      body: string;
      points: number;
      correctAnswer?: Record<string, unknown>;
      rubric?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    };

    const grade =
      q.type === "essay" || q.type === "prompt_evaluation"
        ? await this.gradeWithAi(q, dto.answer)
        : this.gradingService.grade({
            type: q.type,
            answer: dto.answer,
            correctAnswer: q.correctAnswer,
            points: q.points,
          });

    return this.responseModel
      .findOneAndUpdate(
        { participantId, questionId },
        {
          participantId,
          questionId,
          answer: dto.answer,
          isCorrect: grade.isCorrect,
          score: grade.score,
          maxScore: grade.maxScore,
          feedback: grade.feedback,
          aiFeedback: grade.aiFeedback,
        },
        { upsert: true, new: true },
      )
      .exec();
  }

  async answerByParticipant(participantId: string, dto: AnswerDto) {
    if (!dto.questionId) {
      throw new BadRequestException("questionId es requerido");
    }
    return this.answer(participantId, dto.questionId, dto);
  }

  async getByParticipant(participantId: string) {
    return this.responseModel.find({ participantId }).exec();
  }

  async getParticipantResult(participantId: string) {
    const participant = await this.participantModel.findById(participantId).exec();
    if (!participant) throw new NotFoundException("Participante no encontrado");

    const session = await this.sessionsService.findOne(participant.sessionId);
    const questions = await this.questionsService.findByQuiz(session.quizId);
    const responses = await this.responseModel.find({ participantId }).exec();
    const score = responses.reduce((acc, item) => acc + (item.score ?? 0), 0);
    const maxScore = questions.reduce((acc, item) => acc + item.points, 0);
    const pendingGrading = responses.filter(
      (item) => item.score === undefined || item.maxScore === undefined,
    ).length;

    return {
      participantId,
      sessionId: participant.sessionId,
      sessionStatus: session.status,
      reviewAccessEnabled: session.reviewAccessEnabled,
      score,
      maxScore,
      percentage: maxScore > 0 ? Number(((score / maxScore) * 100).toFixed(2)) : 0,
      answers: responses.length,
      totalQuestions: questions.length,
      pendingGrading,
      gradingComplete: pendingGrading === 0,
    };
  }

  async getParticipantReview(participantId: string) {
    const participant = await this.participantModel.findById(participantId).exec();
    if (!participant) throw new NotFoundException("Participante no encontrado");

    const session = await this.sessionsService.findOne(participant.sessionId);
    if (!session.reviewAccessEnabled) {
      return {
        participantId,
        sessionId: participant.sessionId,
        reviewAccessEnabled: false,
        items: [],
      };
    }

    const [questions, responses] = await Promise.all([
      this.questionsService.findByQuiz(session.quizId),
      this.responseModel.find({ participantId }).exec(),
    ]);
    const responsesByQuestion = new Map(
      responses.map((response) => [response.questionId, response]),
    );

    return {
      participantId,
      sessionId: participant.sessionId,
      reviewAccessEnabled: true,
      items: questions.map((question) => {
        const response = responsesByQuestion.get(String(question._id));
        return {
          questionId: String(question._id),
          type: question.type,
          title: question.title,
          body: question.body,
          points: question.points,
          answer: response?.answer ?? null,
          score: response?.score ?? 0,
          maxScore: question.points,
          isCorrect: response?.isCorrect ?? null,
          feedback: response?.feedback,
          aiInsight: response?.aiFeedback ?? null,
          answered: Boolean(response),
        };
      }),
    };
  }

  private async gradeWithAi(
    question: {
      title: string;
      body: string;
      points: number;
      rubric?: Record<string, unknown>;
      correctAnswer?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    },
    answer: Record<string, unknown>,
  ): Promise<GradingOutput> {
    const studentAnswer = this.answerToText(answer);
    const result = await this.aiService.evaluateResponse("system-grader", {
      question: `${question.title}\n${question.body}`,
      studentAnswer,
      rubric: question.rubric,
      structured: {
        correctAnswer: question.correctAnswer,
        metadata: question.metadata,
      },
    });

    const maxScore = question.points;
    const normalizedScore =
      result.maxScore > 0
        ? Math.round((result.score / result.maxScore) * maxScore)
        : 0;

    return {
      score: Math.min(maxScore, Math.max(0, normalizedScore)),
      maxScore,
      feedback: result.feedback,
      isCorrect: undefined,
      aiFeedback: result as unknown as Record<string, unknown>,
    };
  }

  private answerToText(answer: Record<string, unknown>) {
    if (typeof answer.value === "string") return answer.value;
    if (typeof answer.answer === "string") return answer.answer;
    if (typeof answer.renderedPrompt === "string") return answer.renderedPrompt;
    return JSON.stringify(answer);
  }
}

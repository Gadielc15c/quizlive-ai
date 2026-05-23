import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { QuestionsService } from "../questions/questions.service";
import { SessionStatus } from "../sessions/schemas/quiz-session.schema";
import { SessionsService } from "../sessions/sessions.service";
import { JoinSessionDto } from "./dto/join-session.dto";
import {
  Participant,
  ParticipantDocument,
  ParticipantStatus,
} from "./schemas/participant.schema";

@Injectable()
export class ParticipantsService {
  constructor(
    @InjectModel(Participant.name)
    private readonly participantModel: Model<ParticipantDocument>,
    private readonly sessionsService: SessionsService,
    private readonly questionsService: QuestionsService,
  ) {}

  async getJoinInfo(joinToken: string) {
    const session = await this.sessionsService.findByTokenOrCode(joinToken);
    const questions = await this.questionsService.findByQuiz(session.quizId);

    return {
      sessionId: String(session._id),
      quizId: session.quizId,
      status: session.status,
      questionCount: questions.length,
      questions: [],
    };
  }

  async join(joinToken: string, dto: JoinSessionDto) {
    const session = await this.sessionsService.findByTokenOrCode(joinToken);

    if (session.status === SessionStatus.ENDED) {
      throw new BadRequestException("La sesion ya finalizo");
    }

    const participant = await this.participantModel.create({
      sessionId: String(session._id),
      name: dto.name.trim(),
      email: dto.email,
      studentCode: dto.studentCode,
      status: ParticipantStatus.ACTIVE,
      joinedAt: new Date(),
      lastSeenAt: new Date(),
    });

    return {
      participantId: String(participant._id),
      sessionId: String(session._id),
      quizId: session.quizId,
      sessionStatus: session.status,
    };
  }

  async getQuestions(participantId: string) {
    const participant = await this.participantModel.findById(participantId).exec();
    if (!participant) throw new NotFoundException("Participante no encontrado");

    const session = await this.sessionsService.findOne(participant.sessionId);
    const canSeeQuestions =
      session.status === SessionStatus.LIVE ||
      session.status === SessionStatus.PAUSED;
    const questions = canSeeQuestions
      ? await this.questionsService.findByQuiz(session.quizId)
      : [];

    return {
      participantId,
      sessionId: String(session._id),
      quizId: session.quizId,
      sessionStatus: session.status,
      questions: questions.map((question) => this.toStudentQuestion(question)),
    };
  }

  async getBySession(sessionId: string) {
    return this.participantModel.find({ sessionId }).sort({ joinedAt: 1 }).exec();
  }

  async heartbeat(participantId: string) {
    const current = await this.participantModel.findById(participantId).exec();
    if (!current) throw new NotFoundException("Participante no encontrado");

    current.lastSeenAt = new Date();
    if (current.status !== ParticipantStatus.SUBMITTED) {
      current.status = ParticipantStatus.ACTIVE;
    }

    return current.save();
  }

  async submit(participantId: string) {
    const participant = await this.participantModel
      .findByIdAndUpdate(
        participantId,
        { status: ParticipantStatus.SUBMITTED, submittedAt: new Date() },
        { new: true },
      )
      .exec();

    if (!participant) throw new NotFoundException("Participante no encontrado");
    return participant;
  }

  private toStudentQuestion(question: unknown) {
    const q = question as {
      _id: unknown;
      quizId: string;
      type: string;
      title: string;
      body: string;
      instructions?: string;
      points: number;
      options?: Array<{ id: string; label: string }>;
      metadata?: Record<string, unknown>;
      rubric?: Record<string, unknown>;
    };

    return {
      _id: String(q._id),
      quizId: q.quizId,
      type: q.type,
      title: q.title,
      body: q.body,
      instructions: q.instructions,
      points: q.points,
      options: q.options ?? [],
      metadata: q.metadata ?? {},
      rubric: q.rubric ?? {},
    };
  }
}

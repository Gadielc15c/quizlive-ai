import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { randomBytes } from "crypto";
import { isValidObjectId, Model } from "mongoose";
import { Quiz, QuizDocument } from "../quizzes/schemas/quiz.schema";
import { CreateSessionDto } from "./dto/create-session.dto";
import {
  QuizSession,
  QuizSessionDocument,
  SessionStatus,
} from "./schemas/quiz-session.schema";

@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(QuizSession.name)
    private readonly sessionModel: Model<QuizSessionDocument>,
    @InjectModel(Quiz.name)
    private readonly quizModel: Model<QuizDocument>,
  ) {}

  create(quizId: string, dto: CreateSessionDto) {
    const sessionCode = dto.sessionCode ?? this.generateSessionCode();
    const joinToken = this.generateJoinToken();

    return this.sessionModel.create({
      quizId,
      sessionCode,
      joinToken,
      status: SessionStatus.WAITING,
    });
  }

  async findOne(id: string) {
    const session = await this.sessionModel.findById(id).exec();
    if (!session) throw new NotFoundException("Sesion no encontrada");
    return this.applyTimeLimit(session);
  }

  async findByToken(joinToken: string) {
    const session = await this.sessionModel.findOne({ joinToken }).exec();
    if (!session) throw new NotFoundException("Token de sesion invalido");
    return this.applyTimeLimit(session);
  }

  async findByTokenOrCode(tokenOrCode: string) {
    const conditions: Array<Record<string, unknown>> = [
      { joinToken: tokenOrCode },
      { sessionCode: tokenOrCode },
      { quizId: tokenOrCode },
    ];

    if (isValidObjectId(tokenOrCode)) {
      conditions.push({ _id: tokenOrCode });
    }

    const session = await this.sessionModel
      .findOne({
        $or: conditions,
      })
      .sort({ createdAt: -1 })
      .exec();
    if (!session) throw new NotFoundException("Sesion no encontrada");
    return this.applyTimeLimit(session);
  }

  async findByQuiz(quizId: string) {
    const sessions = await this.sessionModel
      .find({ quizId })
      .sort({ createdAt: -1 })
      .exec();
    return Promise.all(sessions.map((session) => this.applyTimeLimit(session)));
  }

  async start(id: string) {
    const session = await this.findOne(id);
    if (session.status === SessionStatus.ENDED) {
      throw new BadRequestException("La sesion ya finalizo");
    }
    session.status = SessionStatus.LIVE;
    session.startedAt = new Date();
    return session.save();
  }

  async pause(id: string) {
    const session = await this.findOne(id);
    if (session.status !== SessionStatus.LIVE) {
      throw new BadRequestException("Solo se puede pausar una sesion en vivo");
    }
    session.status = SessionStatus.PAUSED;
    return session.save();
  }

  async end(id: string) {
    const session = await this.findOne(id);
    session.status = SessionStatus.ENDED;
    session.endedAt = new Date();
    return session.save();
  }

  async getJoinAccess(id: string) {
    const session = await this.findOne(id);
    const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const joinUrl = `${appUrl}/join/${encodeURIComponent(session.quizId)}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(joinUrl)}`;

    return {
      sessionId: String(session._id),
      quizId: session.quizId,
      sessionCode: session.sessionCode,
      joinToken: session.joinToken,
      joinUrl,
      codeJoinUrl: `${appUrl}/join/${encodeURIComponent(session.sessionCode)}`,
      tokenJoinUrl: `${appUrl}/join/${encodeURIComponent(session.joinToken)}`,
      qrUrl,
    };
  }

  async getSessionMeta(sessionId: string): Promise<{ durationMinutes?: number; startedAt?: string }> {
    const session = await this.findOne(sessionId);
    const quiz = await this.quizModel.findById(session.quizId).select("durationMinutes").exec();
    return {
      durationMinutes: quiz?.durationMinutes ?? undefined,
      startedAt: session.startedAt?.toISOString(),
    };
  }

  private generateSessionCode() {
    const chunk = randomBytes(2).toString("hex").toUpperCase();
    const chunk2 = randomBytes(2).toString("hex").toUpperCase();
    return `${chunk}-${chunk2}`;
  }

  private generateJoinToken() {
    return randomBytes(16).toString("hex");
  }

  private async applyTimeLimit(session: QuizSessionDocument) {
    if (session.status !== SessionStatus.LIVE || !session.startedAt) {
      return session;
    }

    const quiz = await this.quizModel
      .findById(session.quizId)
      .select("durationMinutes")
      .exec();
    if (!quiz?.durationMinutes) return session;

    const endsAt = new Date(session.startedAt).getTime() + quiz.durationMinutes * 60_000;
    if (Date.now() < endsAt) return session;

    session.status = SessionStatus.ENDED;
    session.endedAt = new Date(endsAt);
    return session.save();
  }
}

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Participant, ParticipantDocument } from "../participants/schemas/participant.schema";
import { Question, QuestionDocument } from "../questions/schemas/question.schema";
import { StudentResponse, ResponseDocument } from "../responses/schemas/response.schema";
import { SessionsService } from "../sessions/sessions.service";

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Participant.name)
    private readonly participantModel: Model<ParticipantDocument>,
    @InjectModel(StudentResponse.name)
    private readonly responseModel: Model<ResponseDocument>,
    @InjectModel(Question.name)
    private readonly questionModel: Model<QuestionDocument>,
    private readonly sessionsService: SessionsService,
  ) {}

  async getSessionLive(sessionId: string) {
    const session = await this.sessionsService.findOne(sessionId);
    const [participants, questions] = await Promise.all([
      this.participantModel.find({ sessionId }).sort({ joinedAt: 1 }).exec(),
      this.questionModel.find({ quizId: session.quizId }).exec(),
    ]);

    const totalQuestions = questions.length;
    const totalMaxScore = questions.reduce((acc, question) => acc + question.points, 0);
    const participantIds = participants.map((p) => String(p._id));
    const responses = await this.responseModel
      .find({ participantId: { $in: participantIds } })
      .exec();

    const answeredByParticipant = new Map<string, number>();
    const scoreByParticipant = new Map<string, number>();
    for (const r of responses) {
      answeredByParticipant.set(
        r.participantId,
        (answeredByParticipant.get(r.participantId) ?? 0) + 1,
      );
      scoreByParticipant.set(
        r.participantId,
        (scoreByParticipant.get(r.participantId) ?? 0) + (r.score ?? 0),
      );
    }

    const liveParticipants = participants.map((p) => {
      const id = String(p._id);
      const answered = answeredByParticipant.get(id) ?? 0;
      const score = scoreByParticipant.get(id) ?? 0;
      return {
        participantId: id,
        name: p.name,
        status: p.status,
        submittedAt: p.submittedAt ?? null,
        answeredCount: answered,
        progress: totalQuestions ? answered / totalQuestions : 0,
        score,
        maxScore: totalMaxScore,
        percentage:
          totalMaxScore > 0
            ? Number(((score / totalMaxScore) * 100).toFixed(2))
            : 0,
      };
    });
    const percentages = liveParticipants.map((item) => item.percentage);

    return {
      sessionId,
      sessionStatus: session.status,
      totalQuestions,
      maxScore: totalMaxScore,
      averagePercentage: percentages.length
        ? Number(
            (
              percentages.reduce((acc, item) => acc + item, 0) /
              percentages.length
            ).toFixed(2),
          )
        : 0,
      participants: liveParticipants,
    };
  }

  async getSessionResults(sessionId: string) {
    const session = await this.sessionsService.findOne(sessionId);
    const [participants, questions] = await Promise.all([
      this.participantModel.find({ sessionId }).exec(),
      this.questionModel.find({ quizId: session.quizId }).exec(),
    ]);
    const participantIds = participants.map((p) => String(p._id));
    const totalQuestions = questions.length;
    const totalMaxScore = questions.reduce((acc, question) => acc + question.points, 0);
    const responses = await this.responseModel
      .find({ participantId: { $in: participantIds } })
      .exec();

    const byParticipant = participantIds.map((id) => {
      const participant = participants.find((item) => String(item._id) === id);
      const items = responses.filter((r) => r.participantId === id);
      const score = items.reduce((acc, item) => acc + (item.score ?? 0), 0);
      return {
        participantId: id,
        name: participant?.name,
        studentCode: participant?.studentCode,
        status: participant?.status,
        score,
        maxScore: totalMaxScore,
        answers: items.length,
        percentage:
          totalMaxScore > 0
            ? Number(((score / totalMaxScore) * 100).toFixed(2))
            : 0,
      };
    });

    const percentages = byParticipant.map((item) => item.percentage);
    const averagePercentage = percentages.length
      ? Number(
          (
            percentages.reduce((acc, item) => acc + item, 0) /
            percentages.length
          ).toFixed(2),
        )
      : 0;

    return {
      sessionId,
      participants: byParticipant.length,
      totalQuestions,
      maxScore: totalMaxScore,
      summary: {
        averagePercentage,
        highestPercentage: percentages.length ? Math.max(...percentages) : 0,
        lowestPercentage: percentages.length ? Math.min(...percentages) : 0,
        submitted: byParticipant.filter((item) => item.status === "submitted").length,
        pending: byParticipant.filter((item) => item.status !== "submitted").length,
      },
      results: byParticipant,
    };
  }

  async getQuizResults(quizId: string) {
    const questions = await this.questionModel.find({ quizId }).exec();
    const questionIds = questions.map((q) => String(q._id));
    const responses = await this.responseModel
      .find({ questionId: { $in: questionIds } })
      .exec();

    const map = new Map<string, { participantId: string; score: number; maxScore: number }>();
    for (const response of responses) {
      const key = response.participantId;
      const prev = map.get(key) ?? { participantId: key, score: 0, maxScore: 0 };
      prev.score += response.score ?? 0;
      prev.maxScore += response.maxScore ?? 0;
      map.set(key, prev);
    }

    return {
      quizId,
      attempts: map.size,
      results: Array.from(map.values()),
    };
  }
}

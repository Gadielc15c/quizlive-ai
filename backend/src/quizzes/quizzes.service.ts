import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  CreateQuizDto,
  QuizStatus,
  RubricCriterionDto,
} from "./dto/create-quiz.dto";
import { PublishQuizDto } from "./dto/publish-quiz.dto";
import { UpdateQuizDto } from "./dto/update-quiz.dto";
import { Quiz, QuizDocument } from "./schemas/quiz.schema";
import { AuthUser, UserRole } from "../auth/auth.types";

@Injectable()
export class QuizzesService {
  constructor(
    @InjectModel(Quiz.name) private readonly quizModel: Model<QuizDocument>,
  ) {}

  async create(createQuizDto: CreateQuizDto, user: AuthUser): Promise<Quiz> {
    this.validateRubric(createQuizDto.rubric ?? []);
    this.validateDates(createQuizDto.startsAt, createQuizDto.endsAt);

    const created = new this.quizModel({
      ...createQuizDto,
      institutionId: user.institutionId,
      teacherId: user.sub,
      startsAt: createQuizDto.startsAt
        ? new Date(createQuizDto.startsAt)
        : undefined,
      endsAt: createQuizDto.endsAt ? new Date(createQuizDto.endsAt) : undefined,
      status: createQuizDto.status ?? QuizStatus.DRAFT,
    });

    return created.save();
  }

  async findAll(
    user?: AuthUser,
    teacherId?: string,
    courseId?: string,
    status?: QuizStatus,
  ): Promise<Quiz[]> {
    const filter: Record<string, unknown> = {};
    if (user?.role === UserRole.TEACHER) filter.teacherId = user.sub;
    if (teacherId && user?.role !== UserRole.TEACHER) filter.teacherId = teacherId;
    if (courseId) filter.courseId = courseId;
    if (status) filter.status = status;
    return this.quizModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<Quiz> {
    const quiz = await this.quizModel.findById(id).exec();
    if (!quiz) throw new NotFoundException("Quiz no encontrado");
    return quiz;
  }

  async update(id: string, updateQuizDto: UpdateQuizDto): Promise<Quiz> {
    this.validateRubric(updateQuizDto.rubric ?? []);
    this.validateDates(updateQuizDto.startsAt, updateQuizDto.endsAt);

    const payload = {
      ...updateQuizDto,
      startsAt: updateQuizDto.startsAt
        ? new Date(updateQuizDto.startsAt)
        : undefined,
      endsAt: updateQuizDto.endsAt ? new Date(updateQuizDto.endsAt) : undefined,
    };

    const updated = await this.quizModel
      .findByIdAndUpdate(id, payload, { new: true })
      .exec();

    if (!updated) throw new NotFoundException("Quiz no encontrado");
    return updated;
  }

  async remove(id: string): Promise<void> {
    const result = await this.quizModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException("Quiz no encontrado");
  }

  async publish(id: string, dto: PublishQuizDto): Promise<Quiz> {
    const quiz = await this.quizModel.findById(id).exec();
    if (!quiz) throw new NotFoundException("Quiz no encontrado");
    if (quiz.status === QuizStatus.CLOSED && !dto.force) {
      throw new BadRequestException(
        "Quiz cerrado. Usa force=true para republicar.",
      );
    }

    this.validateDates(dto.startsAt, dto.endsAt);
    if (dto.startsAt) quiz.startsAt = new Date(dto.startsAt);
    if (dto.endsAt) quiz.endsAt = new Date(dto.endsAt);

    quiz.status = QuizStatus.PUBLISHED;
    return quiz.save();
  }

  private validateDates(startsAt?: string, endsAt?: string): void {
    if (!startsAt || !endsAt) return;
    if (new Date(startsAt).getTime() >= new Date(endsAt).getTime()) {
      throw new BadRequestException(
        "La fecha de inicio debe ser menor que la fecha de cierre.",
      );
    }
  }

  private validateRubric(rubric: RubricCriterionDto[]): void {
    if (rubric.length === 0) return;
    const total = rubric.reduce((acc, item) => acc + item.weight, 0);
    if (total !== 100) {
      throw new BadRequestException(
        "La suma de pesos de la rubrica debe ser 100.",
      );
    }
  }
}

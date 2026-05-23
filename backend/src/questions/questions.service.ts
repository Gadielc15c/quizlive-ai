import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CreateQuestionDto } from "./dto/create-question.dto";
import { QuestionType } from "./dto/create-question.dto";
import { UpdateQuestionDto } from "./dto/update-question.dto";
import { Question, QuestionDocument } from "./schemas/question.schema";

@Injectable()
export class QuestionsService {
  constructor(
    @InjectModel(Question.name)
    private readonly questionModel: Model<QuestionDocument>,
  ) {}

  create(dto: CreateQuestionDto) {
    this.validateCorrectAnswer(dto.type, dto.correctAnswer);
    return this.questionModel.create(dto);
  }

  findByQuiz(quizId: string) {
    return this.questionModel.find({ quizId }).sort({ createdAt: 1 }).exec();
  }

  async findById(id: string) {
    return this.questionModel.findById(id).exec();
  }

  async update(id: string, dto: UpdateQuestionDto) {
    if (dto.type || Object.prototype.hasOwnProperty.call(dto, "correctAnswer")) {
      const current = await this.questionModel.findById(id).exec();
      if (!current) throw new NotFoundException("Pregunta no encontrada");
      const nextType = dto.type ?? current.type;
      const nextAnswer =
        Object.prototype.hasOwnProperty.call(dto, "correctAnswer")
          ? dto.correctAnswer
          : current.correctAnswer;
      this.validateCorrectAnswer(nextType, nextAnswer);
    }
    const question = await this.questionModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!question) throw new NotFoundException("Pregunta no encontrada");
    return question;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.questionModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException("Pregunta no encontrada");
  }

  private validateCorrectAnswer(
    type: QuestionType,
    correctAnswer?: Record<string, unknown>,
  ) {
    const requiredTypes = [
      QuestionType.MULTIPLE_CHOICE,
      QuestionType.MULTIPLE_SELECT,
      QuestionType.TRUE_FALSE,
      QuestionType.SHORT_ANSWER,
      QuestionType.FILL_BLANK,
      QuestionType.ORDERING,
      QuestionType.MATCHING,
      QuestionType.DRAG_DROP,
      QuestionType.MATRIX_SCALE,
    ];

    if (requiredTypes.includes(type) && !correctAnswer) {
      throw new BadRequestException(
        "correctAnswer es obligatorio para este tipo de pregunta",
      );
    }
  }
}

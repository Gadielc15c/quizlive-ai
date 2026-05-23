import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { QuestionType } from "../dto/create-question.dto";

@Schema({ _id: false })
export class QuestionOption {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  label!: string;
}

const QuestionOptionSchema = SchemaFactory.createForClass(QuestionOption);

export type QuestionDocument = HydratedDocument<Question>;

@Schema({ timestamps: true, collection: "questions" })
export class Question {
  @Prop({ required: true, index: true })
  quizId!: string;

  @Prop({ required: true, enum: QuestionType, index: true })
  type!: QuestionType;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  body!: string;

  @Prop()
  instructions?: string;

  @Prop({ required: true, min: 1, max: 100 })
  points!: number;

  @Prop({ type: [QuestionOptionSchema], default: [] })
  options!: QuestionOption[];

  @Prop({ type: Object })
  correctAnswer?: Record<string, unknown>;

  @Prop({ type: Object })
  rubric?: Record<string, unknown>;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);
QuestionSchema.index({ quizId: 1, createdAt: -1 });


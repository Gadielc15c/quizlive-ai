import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { QuizMode, QuizStatus } from "../dto/create-quiz.dto";

@Schema({ _id: false })
export class RubricCriterion {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, min: 1, max: 100 })
  weight!: number;
}

const RubricCriterionSchema = SchemaFactory.createForClass(RubricCriterion);

@Schema({ _id: false })
export class QuizSettings {
  @Prop({ default: false })
  randomizeQuestions!: boolean;

  @Prop({ default: false })
  randomizeOptions!: boolean;

  @Prop({ default: false })
  showResults!: boolean;

  @Prop({ default: false })
  allowRetries!: boolean;

  @Prop({ default: 1, min: 1, max: 10 })
  retries!: number;
}

const QuizSettingsSchema = SchemaFactory.createForClass(QuizSettings);

export type QuizDocument = HydratedDocument<Quiz>;

@Schema({ timestamps: true, collection: "quizzes" })
export class Quiz {
  @Prop({ required: true, index: true })
  institutionId!: string;

  @Prop({ required: true, index: true })
  teacherId!: string;

  @Prop({ required: true, index: true })
  courseId!: string;

  @Prop({ required: true })
  title!: string;

  @Prop()
  description?: string;

  @Prop({ required: true, enum: QuizMode })
  mode!: QuizMode;

  @Prop({ required: true, enum: QuizStatus, default: QuizStatus.DRAFT, index: true })
  status!: QuizStatus;

  @Prop({ required: true, min: 1, max: 480 })
  durationMinutes!: number;

  @Prop()
  startsAt?: Date;

  @Prop()
  endsAt?: Date;

  @Prop({ type: QuizSettingsSchema, default: {} })
  settings!: QuizSettings;

  @Prop({ type: [RubricCriterionSchema], default: [] })
  rubric!: RubricCriterion[];

  // Estado de generacion IA en background: idle | processing | ready | failed
  @Prop({
    default: "idle",
    enum: ["idle", "processing", "ready", "failed"],
    index: true,
  })
  generationStatus!: "idle" | "processing" | "ready" | "failed";

  @Prop()
  generationError?: string;
}

export const QuizSchema = SchemaFactory.createForClass(Quiz);

QuizSchema.index({ institutionId: 1, courseId: 1, teacherId: 1 });


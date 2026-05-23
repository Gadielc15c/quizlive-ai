import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type ResponseDocument = HydratedDocument<StudentResponse>;

@Schema({ timestamps: true, collection: "responses" })
export class StudentResponse {
  @Prop({ required: true, index: true })
  participantId!: string;

  @Prop({ required: true, index: true })
  questionId!: string;

  @Prop({ type: Object, required: true })
  answer!: Record<string, unknown>;

  @Prop()
  isCorrect?: boolean;

  @Prop()
  score?: number;

  @Prop()
  maxScore?: number;

  @Prop()
  feedback?: string;

  @Prop({ type: Object })
  aiFeedback?: Record<string, unknown>;

  // graded = listo (determinista o LLM); pending = esperando LLM; failed = LLM fallo
  @Prop({ default: "graded", enum: ["graded", "pending", "failed"], index: true })
  gradingStatus!: "graded" | "pending" | "failed";
}

export const ResponseSchema = SchemaFactory.createForClass(StudentResponse);
ResponseSchema.index({ participantId: 1, questionId: 1 }, { unique: true });


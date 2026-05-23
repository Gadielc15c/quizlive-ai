import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export enum SessionStatus {
  WAITING = "waiting",
  LIVE = "live",
  PAUSED = "paused",
  ENDED = "ended",
}

export type QuizSessionDocument = HydratedDocument<QuizSession>;

@Schema({ timestamps: true, collection: "quizSessions" })
export class QuizSession {
  @Prop({ required: true, index: true })
  quizId!: string;

  @Prop({ required: true, unique: true, index: true })
  sessionCode!: string;

  @Prop({ required: true, unique: true, index: true })
  joinToken!: string;

  @Prop({ required: true, enum: SessionStatus, default: SessionStatus.WAITING, index: true })
  status!: SessionStatus;

  @Prop()
  startedAt?: Date;

  @Prop()
  endedAt?: Date;

  @Prop({ default: false })
  reviewAccessEnabled!: boolean;
}

export const QuizSessionSchema = SchemaFactory.createForClass(QuizSession);

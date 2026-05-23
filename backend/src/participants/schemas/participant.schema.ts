import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export enum ParticipantStatus {
  WAITING = "waiting",
  ACTIVE = "active",
  SUBMITTED = "submitted",
  DISCONNECTED = "disconnected",
}

export type ParticipantDocument = HydratedDocument<Participant>;

@Schema({ timestamps: true, collection: "participants" })
export class Participant {
  @Prop({ required: true, index: true })
  sessionId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop()
  email?: string;

  @Prop()
  studentCode?: string;

  @Prop({ required: true, enum: ParticipantStatus, default: ParticipantStatus.WAITING })
  status!: ParticipantStatus;

  @Prop({ default: Date.now })
  joinedAt!: Date;

  @Prop({ default: Date.now })
  lastSeenAt!: Date;

  @Prop()
  submittedAt?: Date;
}

export const ParticipantSchema = SchemaFactory.createForClass(Participant);
ParticipantSchema.index({ sessionId: 1, name: 1 }, { unique: false });


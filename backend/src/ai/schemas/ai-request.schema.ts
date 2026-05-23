import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type AiRequestDocument = HydratedDocument<AiRequest>;

@Schema({ timestamps: true, collection: "aiRequests" })
export class AiRequest {
  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  provider!: string;

  @Prop({ required: true })
  taskType!: string;

  @Prop({ type: Object, required: true })
  payload!: Record<string, unknown>;

  @Prop({ type: Object })
  result?: Record<string, unknown>;

  @Prop({ required: true, default: "ok" })
  status!: string;

  @Prop()
  error?: string;
}

export const AiRequestSchema = SchemaFactory.createForClass(AiRequest);
AiRequestSchema.index({ userId: 1, createdAt: -1 });


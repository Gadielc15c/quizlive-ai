import { IsObject, IsOptional, IsString } from "class-validator";

export class AnswerDto {
  @IsOptional()
  @IsString()
  questionId?: string;

  @IsObject()
  answer!: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}

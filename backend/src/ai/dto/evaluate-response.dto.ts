import { IsObject, IsOptional, IsString } from "class-validator";

export class EvaluateResponseDto {
  @IsString()
  question!: string;

  @IsString()
  studentAnswer!: string;

  @IsOptional()
  @IsObject()
  rubric?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  structured?: Record<string, unknown>;
}

import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  ValidateIf,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export enum QuestionType {
  MULTIPLE_CHOICE = "multiple_choice",
  MULTIPLE_SELECT = "multiple_select",
  TRUE_FALSE = "true_false",
  SHORT_ANSWER = "short_answer",
  ESSAY = "essay",
  FILL_BLANK = "fill_blank",
  ORDERING = "ordering",
  MATCHING = "matching",
  DRAG_DROP = "drag_drop",
  MATRIX_SCALE = "matrix_scale",
  PROMPT_EVALUATION = "prompt_evaluation",
}

export class QuestionOptionDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  label!: string;
}

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  quizId!: string;

  @IsEnum(QuestionType)
  type!: QuestionType;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  body!: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsInt()
  @Min(1)
  @Max(100)
  points!: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];

  @ValidateIf((o: CreateQuestionDto) =>
    [
      QuestionType.MULTIPLE_CHOICE,
      QuestionType.MULTIPLE_SELECT,
      QuestionType.TRUE_FALSE,
      QuestionType.SHORT_ANSWER,
      QuestionType.FILL_BLANK,
      QuestionType.ORDERING,
      QuestionType.MATCHING,
      QuestionType.DRAG_DROP,
      QuestionType.MATRIX_SCALE,
    ].includes(o.type),
  )
  @IsObject()
  correctAnswer?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  rubric?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

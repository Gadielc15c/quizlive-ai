import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

export enum QuizMode {
  LIVE = "live",
  ASYNC = "async",
}

export enum QuizStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  CLOSED = "closed",
}

export class RubricCriterionDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @Min(1)
  @Max(100)
  weight!: number;
}

export class QuizSettingsDto {
  @IsOptional()
  @IsBoolean()
  randomizeQuestions?: boolean;

  @IsOptional()
  @IsBoolean()
  randomizeOptions?: boolean;

  @IsOptional()
  @IsBoolean()
  showResults?: boolean;

  @IsOptional()
  @IsBoolean()
  allowRetries?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  retries?: number;
}

export class CreateQuizDto {
  @IsString()
  @IsNotEmpty()
  courseId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(QuizMode)
  mode!: QuizMode;

  @IsOptional()
  @IsEnum(QuizStatus)
  status?: QuizStatus;

  @IsInt()
  @Min(1)
  @Max(480)
  durationMinutes!: number;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => QuizSettingsDto)
  settings?: QuizSettingsDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RubricCriterionDto)
  rubric?: RubricCriterionDto[];
}

import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { QuizMode } from "../../quizzes/dto/create-quiz.dto";

export class GenerateQuizDto {
  @IsString()
  @IsNotEmpty()
  institutionId!: string;

  @IsString()
  @IsNotEmpty()
  courseId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  topic!: string;

  @IsInt()
  @Min(1)
  @Max(50)
  quantity!: number;

  @IsOptional()
  @IsString()
  difficulty?: "easy" | "medium" | "hard";

  @IsOptional()
  @IsArray()
  types?: string[];

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsEnum(QuizMode)
  mode?: QuizMode;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(480)
  durationMinutes?: number;

  @IsOptional()
  @IsBoolean()
  publishNow?: boolean;
}


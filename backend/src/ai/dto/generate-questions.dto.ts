import { IsArray, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class GenerateQuestionsDto {
  @IsString()
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
}


import { IsBoolean, IsDateString, IsOptional } from "class-validator";

export class PublishQuizDto {
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsBoolean()
  force?: boolean;
}


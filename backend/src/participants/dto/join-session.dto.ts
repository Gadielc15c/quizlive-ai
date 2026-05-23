import { IsEmail, IsOptional, IsString } from "class-validator";

export class JoinSessionDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  studentCode?: string;
}


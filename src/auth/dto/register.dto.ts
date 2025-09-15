import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsIn,
} from "class-validator";

export class RegisterDto {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  country: string;

  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;

  @IsOptional()
  @IsIn([
    "SUPER",
    "ADMIN",
    "REGIONAL_MANAGER",
    "FIELD_MANAGER",
    "FIELD_TECH",
    "TRANSCRIBER",
  ])
  role?:
    | "SUPER"
    | "ADMIN"
    | "REGIONAL_MANAGER"
    | "FIELD_MANAGER"
    | "FIELD_TECH"
    | "TRANSCRIBER";
}

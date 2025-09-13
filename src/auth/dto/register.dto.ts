import { IsEmail, IsNotEmpty, MinLength, IsOptional, IsIn } from 'class-validator';

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
  @IsIn(['USER', 'ADMIN', 'FIELD_MANAGER'])
  role?: 'USER' | 'ADMIN' | 'FIELD_MANAGER';
}

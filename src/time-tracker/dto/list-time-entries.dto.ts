// src/time-tracker/dto/list-time-entries.dto.ts
import { IsOptional, IsDateString, IsInt, Min, Max, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class ListTimeEntriesDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  skip?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  take?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize?: number;

  // Fechas (ambos nombres)
  @IsOptional() @IsDateString()
  fromDate?: string;

  @IsOptional() @IsDateString()
  toDate?: string;

  @IsOptional() @IsDateString()
  startDate?: string;

  @IsOptional() @IsDateString()
  endDate?: string;

  // Filtros extra
  @IsOptional() @IsUUID()
  userId?: string;

  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @IsString()
  supportedCountry?: string;

  @IsOptional() @IsString()
  workingLanguage?: string;
}

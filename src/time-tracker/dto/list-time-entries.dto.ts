// src/time-tracker/dto/list-time-entries.dto.ts
import { IsOptional, IsDateString, IsInt, Min, Max, IsString, IsUUID } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ListTimeEntriesDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  skip?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  take?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize?: number;
  // Nuevos filtros de equipo
  @Transform(({ value }) => value === 'true')
  @IsOptional()
  myTeam?: boolean; // Si es true, mostrar registros de mis equipos

  @IsOptional() @IsString()
  teamId?: string; // Filtrar por equipo específico

  @Transform(({ obj }) => obj.fromDate ?? obj.from_date)
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

  @IsOptional() @Transform(({ value }) => value === 'true')
  returnMeta?: boolean = true; // Por defecto true
}

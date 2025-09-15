// src/time-tracker/dto/update-time-entry.dto.ts
import {
  IsOptional,
  IsString,
  IsDateString,
  IsArray,
  ArrayNotEmpty,
  IsUUID,
} from 'class-validator';

export class UpdateTimeEntryDto {
  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  recipient?: string;

  @IsOptional()
  @IsString()
  personName?: string;

  @IsOptional()
  @IsString()
  supportedCountry?: string;

  @IsOptional()
  @IsString()
  workingLanguage?: string;

  // Fechas ISO (ej: "2025-09-15T14:30:00.000Z")
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  startTimeOfDay?: string; // ejemplo: "15:00"

  @IsOptional()
  @IsString()
  endTimeOfDay?: string;

  @IsOptional()
  @IsString()
  taskDescription?: string;

  // Array de strings
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tasks?: string[];
}

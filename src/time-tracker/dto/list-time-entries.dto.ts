import { Transform } from 'class-transformer';
import { IsArray, IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ListTimeEntriesQueryDto {
  @IsOptional() @IsString()
  createdBy?: string;

  // Nuevos filtros de equipo
  @Transform(({ value }) => value === 'true')
  @IsOptional()
  myTeam?: boolean; // Si es true, mostrar registros de mis equipos

  @IsOptional() @IsString()
  teamId?: string; // Filtrar por equipo específico

  @Transform(({ obj }) => obj.fromDate ?? obj.from_date)
  @IsOptional() @IsDateString()
  fromDate?: string;

  @Transform(({ obj }) => obj.toDate ?? obj.to_date)
  @IsOptional() @IsDateString()
  toDate?: string;

  @Transform(({ obj }) => obj.workingLanguage ?? obj.working_language)
  @IsOptional() @IsString()
  workingLanguage?: string;

  @Transform(({ obj }) => obj.supportedCountry ?? obj.supported_country)
  @IsOptional() @IsString()
  supportedCountry?: string;

  @IsOptional() @IsString()
  recipient?: string;

  @IsOptional() @IsString()
  personName?: string;

  @IsOptional() @IsString()
  task?: string;

  @Transform(({ value }) => {
    if (Array.isArray(value)) return value.map(String).map((s) => s.trim()).filter(Boolean);
    if (typeof value === 'string') return value.split(',').map((s) => s.trim()).filter(Boolean);
    return undefined;
  })
  @IsOptional() @IsArray()
  @IsString({ each: true })
  tasks?: string[];

  @IsOptional() @IsString()
  q?: string;

  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 1))
  @IsOptional() @IsInt() @Min(1)
  page?: number;

  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 50))
  @IsOptional() @IsInt() @Min(1)
  pageSize?: number;

  // Si querés que solo devuelva array plano (sin meta), poné returnMeta=false
  @Transform(({ value }) => (value === 'false' ? false : true))
  @IsOptional()
  returnMeta?: boolean;
}

// src/teams/dto/list-teams.query.ts
import { IsOptional, IsInt, Min, Max, IsString, IsUUID, IsBooleanString } from 'class-validator';
import { Type } from 'class-transformer';

export class ListTeamsQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  skip?: number = 0;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  take?: number = 20;

  @IsOptional() @IsString()
  search?: string;

  // Filtrar por organización o región
  @IsOptional() @IsUUID()
  organizationId?: string;

  @IsOptional() @IsUUID()
  regionId?: string;

  // "true" → usar org del token
  @IsOptional() @IsBooleanString()
  mine?: string;
}

// src/regions/dto/list-regions.query.ts
import { IsOptional, IsInt, Min, Max, IsString, IsUUID, IsBooleanString } from 'class-validator';
import { Type } from 'class-transformer';

export class ListRegionsQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  skip?: number = 0;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  take?: number = 20;

  @IsOptional() @IsString()
  search?: string;

  // filtrar por organización específica
  @IsOptional() @IsUUID()
  organizationId?: string;

  // si es "true", fuerza usar la organización del token
  @IsOptional() @IsBooleanString()
  mine?: string;
}

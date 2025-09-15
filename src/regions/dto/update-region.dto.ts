// src/regions/dto/update-region.dto.ts
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateRegionDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;
}

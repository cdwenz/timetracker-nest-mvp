// src/organizations/dto/list-organizations.query.ts
import { IsOptional, IsInt, Min, Max, IsString, IsBooleanString } from 'class-validator';
import { Type } from 'class-transformer';

export class ListOrganizationsQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  skip?: number = 0;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  take?: number = 20;

  @IsOptional() @IsString()
  search?: string;

  // "true"/"false": si es true, lista solo TU organización (no requiere org:manage)
  @IsOptional() @IsBooleanString()
  mine?: string;
}

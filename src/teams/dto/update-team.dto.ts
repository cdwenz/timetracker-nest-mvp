// src/teams/dto/update-team.dto.ts
import { IsOptional, IsString, MinLength, IsUUID } from 'class-validator';

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  // permitir reasignar manager (opcional)
  @IsOptional()
  @IsUUID()
  managerId?: string;

  // permitir mover de región (opcional, si tu negocio lo permite)
  @IsOptional()
  @IsUUID()
  regionId?: string;
}

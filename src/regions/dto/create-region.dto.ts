// regions/dto/create-region.dto.ts
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateRegionDto {
  @IsString() @IsNotEmpty()
  name: string;

  @IsUUID()
  organizationId: string;
}

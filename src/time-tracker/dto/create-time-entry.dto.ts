import { Transform } from 'class-transformer';
import { IsArray, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateTimeEntryDto {
  @IsOptional() @IsString()
  note?: string;

  @IsOptional() @IsString()
  recipient?: string;

  @Transform(({ obj }) =>
    obj.personName ?? obj.person_name ?? obj.supportedPerson ?? obj.supported_person
  )
  @IsString()
  personName: string;

  @Transform(({ obj }) => obj.supportedCountry ?? obj.supported_country)
  @IsString()
  supportedCountry: string;

  @Transform(({ obj }) => obj.workingLanguage ?? obj.working_language)
  @IsString()
  workingLanguage: string;

  @Transform(({ obj }) => obj.startDate ?? obj.start_date)
  @IsDateString()
  startDate: string;

  @Transform(({ obj }) => obj.endDate ?? obj.end_date)
  @IsDateString()
  endDate: string;

  @Transform(({ obj }) => obj.startTimeOfDay ?? obj.start_time_of_day)
  @IsOptional() @IsString()
  startTimeOfDay?: string; // "HH:mm"

  @Transform(({ obj }) => obj.endTimeOfDay ?? obj.end_time_of_day)
  @IsOptional() @IsString()
  endTimeOfDay?: string;   // "HH:mm"

  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map((v) => String(v).trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
      return value.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return undefined;
  })
  @IsOptional() @IsArray()
  @IsString({ each: true })
  tasks?: string[];

  @Transform(({ obj }) => obj.taskDescription ?? obj.task_description)
  @IsOptional() @IsString()
  taskDescription?: string;
}

import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

enum TripStatusDto {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
}

enum CollaboratorRoleDto {
  OWNER = 'OWNER',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

class TripItemInputDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  day?: number;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsDateString()
  time?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  type?: string;
}

class TripCollaboratorInputDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsEnum(CollaboratorRoleDto)
  role?: CollaboratorRoleDto;
}

export class CreateTripDto {
  @IsString()
  ownerUserId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsEnum(TripStatusDto)
  status?: TripStatusDto;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  budgetTotal?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TripCollaboratorInputDto)
  collaborators?: TripCollaboratorInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TripItemInputDto)
  items?: TripItemInputDto[];
}

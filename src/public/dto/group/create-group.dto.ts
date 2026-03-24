import { Type } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  cityId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000000)
  coverImage?: string;

  @IsISO8601()
  startDate!: string;

  @IsISO8601()
  endDate!: string;

  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(100)
  capacity!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetMin!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetMax!: number;
}

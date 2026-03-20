import { Type } from 'class-transformer';
import {
  IsDateString,
  IsDecimal,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { BookingType, BookingStatus } from '@prisma/client';

export class CreateBookingDto {
  @IsOptional()
  @IsUUID()
  tripId?: string;

  @IsUUID()
  userId: string;

  @IsString()
  itemName: string;

  @IsEnum(BookingType)
  type: BookingType;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  externalRef?: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0.01, { message: 'basePrice must be greater than 0' })
  basePrice: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0, { message: 'commissionPct must be at least 0' })
  commissionPct?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

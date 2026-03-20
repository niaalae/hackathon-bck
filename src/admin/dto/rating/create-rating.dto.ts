import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateRatingDto {
  @IsInt()
  @Type(() => Number)
  score: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsString()
  fromUserId: string;

  @IsString()
  guideId: string;

  @IsOptional()
  @IsString()
  tripId?: string;
}

import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class PlaceFeedbackDto {
  @IsOptional()
  @IsString()
  placeId?: string;

  @IsOptional()
  @IsString()
  attractionId?: string;

  @IsBoolean()
  liked: boolean;
}

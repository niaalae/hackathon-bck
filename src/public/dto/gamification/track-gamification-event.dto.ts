import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { GAMIFICATION_EVENT_TYPES } from './gamification-event-type';

export class TrackGamificationEventDto {
  @IsIn(GAMIFICATION_EVENT_TYPES)
  type!: (typeof GAMIFICATION_EVENT_TYPES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  amount?: number;
}

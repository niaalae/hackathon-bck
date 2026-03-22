import { IsBoolean } from 'class-validator';

export class UpdateGamificationSettingsDto {
  @IsBoolean()
  enabled!: boolean;
}

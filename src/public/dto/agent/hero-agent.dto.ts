import { IsString, MinLength } from 'class-validator';

export class HeroAgentDto {
  @IsString()
  @MinLength(1)
  prompt: string;
}

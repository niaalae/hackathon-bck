import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateGroupMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string;
}

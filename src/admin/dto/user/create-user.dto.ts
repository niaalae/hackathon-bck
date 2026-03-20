import { Type } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

enum UserRoleDto {
  TRAVELER = 'TRAVELER',
  GUIDE = 'GUIDE',
  ADMIN = 'ADMIN',
}

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  preferences?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsEnum(UserRoleDto)
  @Type(() => String)
  role?: UserRoleDto;
}

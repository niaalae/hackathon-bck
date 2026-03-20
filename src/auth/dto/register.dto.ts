import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator'

enum UserRoleDto {
  TRAVELER = 'TRAVELER',
  GUIDE = 'GUIDE',
  ADMIN = 'ADMIN',
}

export class RegisterDto {
  @IsString()
  name: string

  @IsEmail()
  email: string

  @IsString()
  password: string

  @IsOptional()
  preferences?: Record<string, unknown>

  @IsOptional()
  @IsEnum(UserRoleDto)
  role?: UserRoleDto
}

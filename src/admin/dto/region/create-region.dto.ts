import { IsOptional, IsString } from 'class-validator';

export class CreateRegionDto {
  @IsString()
  name: string;

  @IsString()
  country: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;
}

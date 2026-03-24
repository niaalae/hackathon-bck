import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewGroupMembershipDto {
  @IsIn(['MEMBER', 'REJECTED'])
  status!: 'MEMBER' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

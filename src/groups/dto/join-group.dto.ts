import { IsString, IsOptional } from 'class-validator';

export class JoinGroupDto {
  @IsString()
  groupId: string;

  @IsOptional()
  @IsString()
  password?: string;
}
import { IsString, IsOptional, MaxLength, IsArray, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCommanderDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  scryfallId?: string;

  @IsOptional()
  @IsString()
  colorIdentity?: string;
}

export class CreateDeckDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCommanderDto)
  @IsNotEmpty({ message: 'At least one commander is required' })
  commanders: CreateCommanderDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
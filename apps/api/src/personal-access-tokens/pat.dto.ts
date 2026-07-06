import { PAT_SCOPES, type PatScope } from '@my-little-pony/core';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreatePatDto {
  @ApiProperty({ example: 'Claude Code' })
  @IsString()
  name!: string;

  @ApiProperty({
    isArray: true,
    enum: PAT_SCOPES as unknown as string[],
    example: ['documents:read', 'documents:write'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(PAT_SCOPES as unknown as string[], { each: true })
  scopes!: PatScope[];

  @ApiPropertyOptional({ description: 'Validade em dias (omitir = não expira)', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  expiresInDays?: number;
}

export class UpdatePatDto {
  @ApiPropertyOptional({ example: 'Claude Code' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ isArray: true, enum: PAT_SCOPES as unknown as string[] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(PAT_SCOPES as unknown as string[], { each: true })
  scopes?: PatScope[];
}

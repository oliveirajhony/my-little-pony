import type { LlmBackend } from '@my-little-pony/core';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLlmProviderDto {
  @ApiProperty({ description: 'Nome do provedor (ex.: "OpenRouter · Claude")' })
  @IsString()
  @MaxLength(80)
  label!: string;

  @ApiProperty({ enum: ['openai', 'ollama'] })
  @IsIn(['openai', 'ollama'])
  backend!: LlmBackend;

  @ApiPropertyOptional({ description: 'Base URL do endpoint (obrigatória para openai)' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  baseUrl?: string;

  @ApiProperty({ description: 'Modelo (ex.: anthropic/claude-3.5-sonnet)' })
  @IsString()
  @MaxLength(120)
  model!: string;

  @ApiPropertyOptional({ description: 'Chave de API — cifrada e nunca reexibida' })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  apiKey?: string;
}

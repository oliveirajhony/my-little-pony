import {
  DOCUMENT_THEMES,
  PAGE_ORIENTATIONS,
  PAPER_SIZES,
  type PageConfigPatch,
} from '@my-little-pony/core';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export class PageMarginsDto {
  @ApiPropertyOptional({ description: 'Margem superior (cm)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  top?: number;

  @ApiPropertyOptional({ description: 'Margem direita (cm)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  right?: number;

  @ApiPropertyOptional({ description: 'Margem inferior (cm)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bottom?: number;

  @ApiPropertyOptional({ description: 'Margem esquerda (cm)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  left?: number;
}

export class PageConfigDto implements PageConfigPatch {
  @ApiPropertyOptional({ enum: PAPER_SIZES as unknown as string[] })
  @IsOptional()
  @IsIn(PAPER_SIZES as unknown as string[])
  paperSize?: PageConfigPatch['paperSize'];

  @ApiPropertyOptional({ enum: PAGE_ORIENTATIONS as unknown as string[] })
  @IsOptional()
  @IsIn(PAGE_ORIENTATIONS as unknown as string[])
  orientation?: PageConfigPatch['orientation'];

  @ApiPropertyOptional({ example: '#ffffff', description: 'Cor de fundo da página (hex)' })
  @IsOptional()
  @Matches(HEX_COLOR, { message: 'pageColor deve ser uma cor hex (#rgb ou #rrggbb).' })
  pageColor?: string;

  @ApiPropertyOptional({ enum: DOCUMENT_THEMES as unknown as string[] })
  @IsOptional()
  @IsIn(DOCUMENT_THEMES as unknown as string[])
  documentTheme?: PageConfigPatch['documentTheme'];

  @ApiPropertyOptional({ type: PageMarginsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PageMarginsDto)
  margins?: PageMarginsDto;
}

export class CreateDocumentDto {
  @ApiPropertyOptional({ example: 'Roadmap do produto — Q3' })
  @IsOptional()
  @IsString()
  title?: string;
}

export class SaveDraftDto {
  @ApiProperty({ example: 0, description: 'Versão que o cliente leu (concorrência otimista)' })
  @IsInt()
  @Min(0)
  version!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'HTML do editor' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ type: [String], example: ['Produto'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ type: PageConfigDto, description: 'Opções de página/tema do documento' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PageConfigDto)
  pageConfig?: PageConfigDto;
}

export class ListDocumentsDto {
  @ApiPropertyOptional({ description: 'Busca full-text por título/conteúdo' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ['draft', 'published'] })
  @IsOptional()
  @IsIn(['draft', 'published'])
  status?: 'draft' | 'published';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

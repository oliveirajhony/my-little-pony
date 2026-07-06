import {
  DOCUMENT_THEMES,
  PAGE_ORIENTATIONS,
  PAPER_SIZES,
  type PageConfig,
} from '@my-little-pony/core';
import { ApiProperty } from '@nestjs/swagger';

class PageMarginsResponse {
  @ApiProperty() top!: number;
  @ApiProperty() right!: number;
  @ApiProperty() bottom!: number;
  @ApiProperty() left!: number;
}

export class PageConfigResponse implements PageConfig {
  @ApiProperty({ enum: PAPER_SIZES as unknown as string[] })
  paperSize!: PageConfig['paperSize'];

  @ApiProperty({ enum: PAGE_ORIENTATIONS as unknown as string[] })
  orientation!: PageConfig['orientation'];

  @ApiProperty()
  pageColor!: string;

  @ApiProperty({ type: PageMarginsResponse })
  margins!: PageMarginsResponse;

  @ApiProperty({ enum: DOCUMENT_THEMES as unknown as string[] })
  documentTheme!: PageConfig['documentTheme'];
}

export class DocumentSummaryResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ enum: ['draft', 'published'] })
  status!: string;

  @ApiProperty()
  excerpt!: string;

  @ApiProperty({ type: [String] })
  categories!: string[];

  @ApiProperty({ enum: ['none', 'indexing', 'ready', 'failed'] })
  indexStatus!: string;

  @ApiProperty()
  version!: number;

  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  publishedAt!: string | null;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class DocumentDetailResponse extends DocumentSummaryResponse {
  @ApiProperty({ description: 'HTML do editor' })
  content!: string;

  @ApiProperty({ type: PageConfigResponse })
  pageConfig!: PageConfigResponse;
}

export class DocumentListResponse {
  @ApiProperty({ type: [DocumentSummaryResponse] })
  items!: DocumentSummaryResponse[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}

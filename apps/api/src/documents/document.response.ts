import { ApiProperty } from '@nestjs/swagger';

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

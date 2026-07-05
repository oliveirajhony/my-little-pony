import { GetPublicDocument } from '@my-little-pony/core';
import { Controller, Get, NotFoundException, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

export class PublicDocumentResponse {
  @ApiProperty()
  title!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ description: 'HTML publicado' })
  content!: string;

  @ApiProperty()
  excerpt!: string;

  @ApiProperty({ type: [String] })
  categories!: string[];

  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  publishedAt!: string | null;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

@ApiTags('public')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
@Controller('public/documents')
export class PublicController {
  constructor(private readonly getPublicDocument: GetPublicDocument) {}

  @Get(':ownerId/:slug')
  @ApiOperation({ summary: 'Documento publicado, por autor + slug (anônimo, com cache)' })
  @ApiOkResponse({ type: PublicDocumentResponse })
  content(
    // ownerId malformado não pode existir: cai em 404 (não 500 do cast de uuid).
    @Param('ownerId', new ParseUUIDPipe({ exceptionFactory: () => new NotFoundException() }))
    ownerId: string,
    @Param('slug') slug: string,
  ): Promise<PublicDocumentResponse> {
    return this.getPublicDocument.execute(ownerId, slug);
  }
}

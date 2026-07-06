import type { SourceFile, SourceFileKind } from '@my-little-pony/core';
import { ApiProperty } from '@nestjs/swagger';

export class SourceFileResponse {
  @ApiProperty() id!: string;
  @ApiProperty() filename!: string;
  @ApiProperty({ enum: ['pdf', 'docx', 'doc', 'md', 'html'] }) kind!: SourceFileKind;
  @ApiProperty() contentType!: string;
  @ApiProperty() sizeBytes!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export function toSourceFileResponse(file: SourceFile): SourceFileResponse {
  return {
    id: file.id,
    filename: file.filename,
    kind: file.kind,
    contentType: file.contentType,
    sizeBytes: file.sizeBytes,
    createdAt: file.createdAt.toISOString(),
  };
}

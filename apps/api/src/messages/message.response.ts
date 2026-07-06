import { ApiProperty } from '@nestjs/swagger';

export class ContactMessageResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  documentId!: string;

  @ApiProperty()
  fromName!: string;

  @ApiProperty()
  fromEmail!: string;

  @ApiProperty()
  message!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  readAt!: string | null;
}

export class ContactMessageListResponse {
  @ApiProperty({ type: [ContactMessageResponse] })
  items!: ContactMessageResponse[];

  @ApiProperty()
  total!: number;

  @ApiProperty({ description: 'Quantidade de não-lidas' })
  unread!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}

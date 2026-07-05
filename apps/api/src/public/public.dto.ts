import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class EmailDocumentDto {
  @ApiProperty({ example: 'voce@exemplo.com' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email!: string;
}

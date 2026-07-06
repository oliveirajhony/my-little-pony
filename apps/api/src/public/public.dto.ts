import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class EmailDocumentDto {
  @ApiProperty({ example: 'voce@exemplo.com' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email!: string;
}

export class ContactMessageDto {
  @ApiProperty({ example: 'Ana' })
  @IsString()
  @IsNotEmpty({ message: 'Informe seu nome.' })
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'ana@exemplo.com' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email!: string;

  @ApiProperty({ example: 'Ótimo documento!' })
  @IsString()
  @IsNotEmpty({ message: 'Escreva uma mensagem.' })
  @MaxLength(4000)
  message!: string;
}

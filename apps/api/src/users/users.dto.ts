import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Jhony O.' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'novo@mlp.app' })
  @IsOptional()
  @IsString()
  email?: string;

  // Accept an explicit null to clear the avatar; otherwise a string URL.
  @ApiPropertyOptional({ example: null, nullable: true })
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  avatarUrl?: string | null;
}

export class AvatarFromUrlDto {
  @ApiProperty({ example: 'https://exemplo.com/foto.jpg' })
  @IsString()
  @IsNotEmpty({ message: 'Informe a URL da imagem.' })
  url!: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'segredo123' })
  @IsString()
  @IsNotEmpty({ message: 'Informe a senha atual.' })
  current!: string;

  @ApiProperty({ example: 'novaSenha456', minLength: 8 })
  @IsString()
  @IsNotEmpty({ message: 'Informe a nova senha.' })
  next!: string;
}

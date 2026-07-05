import { IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  // Accept an explicit null to clear the avatar; otherwise a string URL.
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  avatarUrl?: string | null;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe a senha atual.' })
  current!: string;

  @IsString()
  @IsNotEmpty({ message: 'Informe a nova senha.' })
  next!: string;
}

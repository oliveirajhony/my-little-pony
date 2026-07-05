import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

// DTOs enforce shape; semantic rules (email format, password strength, unique
// email) are the domain's job and surface as pt-BR errors via the filter.
export class RegisterDto {
  @ApiProperty({ example: 'Jhony Oliveira' })
  @IsString()
  @IsNotEmpty({ message: 'Informe seu nome.' })
  name!: string;

  @ApiProperty({ example: 'jhony@mlp.app' })
  @IsString()
  @IsNotEmpty({ message: 'Informe seu e-mail.' })
  email!: string;

  @ApiProperty({ example: 'segredo123', minLength: 8 })
  @IsString()
  @IsNotEmpty({ message: 'Informe sua senha.' })
  password!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'jhony@mlp.app' })
  @IsString()
  @IsNotEmpty({ message: 'Informe seu e-mail.' })
  email!: string;

  @ApiProperty({ example: 'segredo123' })
  @IsString()
  @IsNotEmpty({ message: 'Informe sua senha.' })
  password!: string;
}

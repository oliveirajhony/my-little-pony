import { IsNotEmpty, IsString } from 'class-validator';

// DTOs enforce shape; semantic rules (email format, password strength, unique
// email) are the domain's job and surface as pt-BR errors via the filter.
export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe seu nome.' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Informe seu e-mail.' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Informe sua senha.' })
  password!: string;
}

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe seu e-mail.' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Informe sua senha.' })
  password!: string;
}

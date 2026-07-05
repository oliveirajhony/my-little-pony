import { ApiProperty } from '@nestjs/swagger';
import { UserResponse } from '../users/user.response';

export class AuthResponse {
  @ApiProperty({ type: UserResponse })
  user!: UserResponse;

  @ApiProperty({ description: 'JWT de acesso (curto). Enviar em Authorization: Bearer.' })
  accessToken!: string;
}

export class AccessTokenResponse {
  @ApiProperty()
  accessToken!: string;
}

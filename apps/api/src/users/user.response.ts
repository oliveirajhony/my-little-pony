import { ApiProperty } from '@nestjs/swagger';

export class UserResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ type: String, nullable: true })
  avatarUrl!: string | null;
}

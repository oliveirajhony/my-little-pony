import type { PatScope, PersonalAccessToken } from '@my-little-pony/core';
import { ApiProperty } from '@nestjs/swagger';

export class PersonalAccessTokenResponse {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ description: 'Prefixo visível para identificar o token' }) prefix!: string;
  @ApiProperty({ type: [String] }) scopes!: PatScope[];
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) lastUsedAt!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) expiresAt!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class CreatedPersonalAccessTokenResponse extends PersonalAccessTokenResponse {
  @ApiProperty({ description: 'O token em texto puro — mostrado apenas uma vez.' })
  token!: string;
}

export function toPatResponse(token: PersonalAccessToken): PersonalAccessTokenResponse {
  return {
    id: token.id,
    name: token.name,
    prefix: token.prefix,
    scopes: token.scopes,
    lastUsedAt: token.lastUsedAt ? token.lastUsedAt.toISOString() : null,
    expiresAt: token.expiresAt ? token.expiresAt.toISOString() : null,
    createdAt: token.createdAt.toISOString(),
  };
}

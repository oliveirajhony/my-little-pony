import type { LlmBackend, LlmProviderView } from '@my-little-pony/core';
import { ApiProperty } from '@nestjs/swagger';

/** Vista de um provedor devolvida pela API — NUNCA inclui a chave. */
export class LlmProviderResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ enum: ['openai', 'ollama'] })
  backend!: LlmBackend;

  @ApiProperty()
  baseUrl!: string;

  @ApiProperty()
  model!: string;

  @ApiProperty({ nullable: true, description: 'Máscara da chave (nunca a chave em si)' })
  apiKeyHint!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: string;
}

export function toLlmProviderResponse(view: LlmProviderView): LlmProviderResponse {
  return {
    id: view.id,
    label: view.label,
    backend: view.backend,
    baseUrl: view.baseUrl,
    model: view.model,
    apiKeyHint: view.apiKeyHint,
    isActive: view.isActive,
    createdAt: view.createdAt.toISOString(),
  };
}

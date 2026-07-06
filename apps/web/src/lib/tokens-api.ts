/**
 * Cliente da API de Personal Access Tokens. Usada na tela de Configurações para
 * criar/listar/revogar tokens que agentes externos (Claude Code e afins) usam
 * no servidor MCP.
 */

import { apiFetch } from './api-client';

export const PAT_SCOPES = [
  'documents:read',
  'documents:write',
  'documents:publish',
  'files:read',
  'messages:read',
  'messages:write',
  'profile:read',
  'profile:write',
] as const;

export type PatScope = (typeof PAT_SCOPES)[number];

/** Rótulos (pt-BR) de cada escopo, para a UI. */
export const SCOPE_LABELS: Record<PatScope, string> = {
  'documents:read': 'Ler documentos',
  'documents:write': 'Criar e editar documentos',
  'documents:publish': 'Publicar e despublicar',
  'files:read': 'Ler e perguntar aos arquivos',
  'messages:read': 'Ler mensagens',
  'messages:write': 'Marcar mensagens como lidas',
  'profile:read': 'Ler perfil',
  'profile:write': 'Editar perfil',
};

export type AccessToken = {
  id: string;
  name: string;
  prefix: string;
  scopes: PatScope[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

/** Resposta da criação — inclui o token cru (mostrado uma única vez). */
export type CreatedAccessToken = AccessToken & { token: string };

export function listTokens(): Promise<AccessToken[]> {
  return apiFetch<AccessToken[]>('/users/me/tokens');
}

export function createToken(input: {
  name: string;
  scopes: PatScope[];
  expiresInDays?: number;
}): Promise<CreatedAccessToken> {
  return apiFetch<CreatedAccessToken>('/users/me/tokens', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Edita nome e/ou escopos (não altera o valor do token). */
export function updateToken(
  id: string,
  input: { name?: string; scopes?: PatScope[] },
): Promise<AccessToken> {
  return apiFetch<AccessToken>(`/users/me/tokens/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function revokeToken(id: string): Promise<void> {
  return apiFetch<void>(`/users/me/tokens/${id}`, { method: 'DELETE' });
}

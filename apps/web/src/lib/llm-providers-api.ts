/**
 * Cliente da API de provedores de LLM. Usada na tela de Configurações para
 * plugar o modelo/chave que a geração do Explorar usa. A chave é cifrada no
 * servidor e NUNCA volta — a API só devolve uma máscara (`apiKeyHint`). Por isso
 * não há edição: para trocar a chave, remove-se e cria-se de novo.
 */

import { apiFetch } from './api-client';

/** Backend que o rag-service entende ao gerar a resposta. */
export type LlmBackend = 'openai' | 'ollama';

export type LlmProvider = {
  id: string;
  label: string;
  backend: LlmBackend;
  baseUrl: string;
  model: string;
  /** Máscara da chave (ex.: `sk-a…z12`) — nunca a chave em si; `null` sem chave. */
  apiKeyHint: string | null;
  isActive: boolean;
  createdAt: string;
};

export type CreateLlmProviderInput = {
  label: string;
  backend: LlmBackend;
  baseUrl?: string;
  model: string;
  apiKey?: string;
};

export function listLlmProviders(): Promise<LlmProvider[]> {
  return apiFetch<LlmProvider[]>('/users/me/llm-providers');
}

export function addLlmProvider(input: CreateLlmProviderInput): Promise<LlmProvider> {
  return apiFetch<LlmProvider>('/users/me/llm-providers', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Ativa um provedor (o servidor desativa os outros do usuário). */
export function activateLlmProvider(id: string): Promise<void> {
  return apiFetch<void>(`/users/me/llm-providers/${id}/activate`, { method: 'POST' });
}

export function removeLlmProvider(id: string): Promise<void> {
  return apiFetch<void>(`/users/me/llm-providers/${id}`, { method: 'DELETE' });
}

/**
 * Presets que prefilam backend + base URL de provedores comuns. Anthropic e
 * Gemini nativos entram via OpenRouter/endpoint compatível (só `/chat/completions`).
 * `requiresKey` controla se o campo de chave é obrigatório na UI.
 */
export type LlmPreset = {
  id: string;
  label: string;
  backend: LlmBackend;
  baseUrl: string;
  /** Modelo sugerido (o usuário pode trocar). */
  modelPlaceholder: string;
  requiresKey: boolean;
  hint?: string;
};

export const LLM_PRESETS: LlmPreset[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    backend: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    modelPlaceholder: 'gpt-4o-mini',
    requiresKey: true,
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    backend: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    modelPlaceholder: 'anthropic/claude-3.5-sonnet',
    requiresKey: true,
    hint: 'Acessa Claude, Gemini e centenas de modelos com uma só chave.',
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    backend: 'openai',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    modelPlaceholder: 'gemini-2.0-flash',
    requiresKey: true,
    hint: 'Endpoint compatível com OpenAI do Gemini.',
  },
  {
    id: 'groq',
    label: 'Groq',
    backend: 'openai',
    baseUrl: 'https://api.groq.com/openai/v1',
    modelPlaceholder: 'llama-3.3-70b-versatile',
    requiresKey: true,
  },
  {
    id: 'lmstudio',
    label: 'LM Studio (local)',
    backend: 'openai',
    baseUrl: 'http://host.docker.internal:1234/v1',
    modelPlaceholder: 'local-model',
    requiresKey: false,
    hint: 'Servidor local do LM Studio — normalmente sem chave.',
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    backend: 'ollama',
    baseUrl: 'http://host.docker.internal:11434',
    modelPlaceholder: 'llama3.1',
    requiresKey: false,
    hint: 'Servidor local do Ollama.',
  },
  {
    id: 'custom',
    label: 'Personalizado',
    backend: 'openai',
    baseUrl: '',
    modelPlaceholder: 'nome-do-modelo',
    requiresKey: false,
    hint: 'Qualquer endpoint compatível com /chat/completions.',
  },
];

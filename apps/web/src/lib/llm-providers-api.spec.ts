import { describe, expect, it, vi } from 'vitest';

const apiFetch = vi.fn().mockResolvedValue(undefined);
vi.mock('./api-client', () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }));

import {
  activateLlmProvider,
  addLlmProvider,
  LLM_PRESETS,
  type LlmProvider,
  listLlmProviders,
  removeLlmProvider,
} from './llm-providers-api';

describe('llm-providers-api', () => {
  it('lista via GET /users/me/llm-providers', async () => {
    apiFetch.mockClear();
    await listLlmProviders();
    expect(apiFetch).toHaveBeenCalledWith('/users/me/llm-providers');
  });

  it('adiciona via POST com o corpo do provedor', async () => {
    apiFetch.mockClear();
    await addLlmProvider({
      label: 'Claude',
      backend: 'openai',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'anthropic/claude-3.5-sonnet',
      apiKey: 'sk-secret',
    });
    expect(apiFetch).toHaveBeenCalledWith('/users/me/llm-providers', {
      method: 'POST',
      body: JSON.stringify({
        label: 'Claude',
        backend: 'openai',
        baseUrl: 'https://openrouter.ai/api/v1',
        model: 'anthropic/claude-3.5-sonnet',
        apiKey: 'sk-secret',
      }),
    });
  });

  it('ativa via POST /:id/activate', async () => {
    apiFetch.mockClear();
    await activateLlmProvider('p1');
    expect(apiFetch).toHaveBeenCalledWith('/users/me/llm-providers/p1/activate', {
      method: 'POST',
    });
  });

  it('remove via DELETE /:id', async () => {
    apiFetch.mockClear();
    await removeLlmProvider('p1');
    expect(apiFetch).toHaveBeenCalledWith('/users/me/llm-providers/p1', { method: 'DELETE' });
  });

  it('o tipo LlmProvider não expõe a chave — só a máscara', () => {
    // Contrato: a resposta traz apiKeyHint, nunca a chave. Se alguém adicionar um
    // campo de chave ao tipo, este teste falha na compilação (typecheck do CI).
    const provider: LlmProvider = {
      id: 'p1',
      label: 'Claude',
      backend: 'openai',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'anthropic/claude-3.5-sonnet',
      apiKeyHint: 'sk-a…z12',
      isActive: true,
      createdAt: '2026-07-11T00:00:00.000Z',
    };
    expect(Object.keys(provider)).not.toContain('apiKey');
    expect(Object.keys(provider)).not.toContain('apiKeyEncrypted');
  });

  it('cada preset tem backend válido e placeholder de modelo', () => {
    for (const preset of LLM_PRESETS) {
      expect(['openai', 'ollama']).toContain(preset.backend);
      expect(preset.modelPlaceholder.length).toBeGreaterThan(0);
    }
  });
});

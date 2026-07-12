import { describe, expect, it } from 'vitest';
import { DomainError } from '../domain/errors.js';
import type { LlmProvider } from '../domain/llm-provider.js';
import {
  ActivateLlmProvider,
  AddLlmProvider,
  ListLlmProviders,
  RemoveLlmProvider,
  ResolveActiveLlmConfig,
} from './llm-provider-use-cases.js';
import type { Clock, Encryptor, IdGenerator, LlmProviderRepository } from './ports.js';

class InMemoryRepo implements LlmProviderRepository {
  store = new Map<string, LlmProvider>();
  async listByOwner(ownerId: string) {
    return [...this.store.values()].filter((p) => p.isOwnedBy(ownerId));
  }
  async findById(id: string) {
    return this.store.get(id) ?? null;
  }
  async findActive(ownerId: string) {
    return [...this.store.values()].find((p) => p.isOwnedBy(ownerId) && p.isActive) ?? null;
  }
  async save(p: LlmProvider) {
    this.store.set(p.id, p);
  }
  async delete(id: string) {
    this.store.delete(id);
  }
  async deactivateAllForOwner(ownerId: string) {
    for (const p of this.store.values()) if (p.isOwnedBy(ownerId)) p.deactivate();
  }
}

// Encryptor de brinquedo: reversível, prefixado (prova que cifra/decifra, sem crypto real).
const fakeEncryptor: Encryptor = {
  encrypt: (plain) => `enc(${plain})`,
  decrypt: (cipher) => cipher.replace(/^enc\(|\)$/g, ''),
};

function deps() {
  const repo = new InMemoryRepo();
  let n = 0;
  const ids: IdGenerator = { next: () => `id-${++n}` };
  const clock: Clock = { now: () => new Date('2026-07-12T00:00:00Z') };
  return { repo, ids, clock };
}

const add = (repo: InMemoryRepo, ids: IdGenerator, clock: Clock) =>
  new AddLlmProvider(repo, ids, clock, fakeEncryptor);

describe('LLM providers use-cases', () => {
  it('adiciona cifrando a chave e calculando a máscara; a vista não vaza o segredo', async () => {
    const { repo, ids, clock } = deps();
    const view = await add(repo, ids, clock).execute({
      ownerId: 'o1',
      label: 'OpenRouter',
      backend: 'openai',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'anthropic/claude-3.5-sonnet',
      apiKey: 'sk-or-v1-0123456789abcdef',
    });

    expect(view.apiKeyHint).toBe('sk-o…cdef');
    expect(Object.keys(view)).not.toContain('apiKeyEncrypted');
    // o que está guardado está cifrado
    const stored = await repo.findById(view.id);
    expect(stored?.apiKeyEncrypted).toBe('enc(sk-or-v1-0123456789abcdef)');
  });

  it('provedor local sem chave fica com hint/encrypted nulos', async () => {
    const { repo, ids, clock } = deps();
    const view = await add(repo, ids, clock).execute({
      ownerId: 'o1',
      label: 'Ollama',
      backend: 'ollama',
      baseUrl: 'http://ollama:11434',
      model: 'qwen2.5:7b-instruct',
    });
    expect(view.apiKeyHint).toBeNull();
    expect((await repo.findById(view.id))?.apiKeyEncrypted).toBeNull();
  });

  it('list devolve as vistas do dono sem o segredo', async () => {
    const { repo, ids, clock } = deps();
    await add(repo, ids, clock).execute({
      ownerId: 'o1',
      label: 'A',
      backend: 'openai',
      baseUrl: 'https://x/v1',
      model: 'm',
      apiKey: 'key-abcdefgh',
    });
    const list = await new ListLlmProviders(repo).execute({ ownerId: 'o1' });
    expect(list).toHaveLength(1);
    expect(list[0]).not.toHaveProperty('apiKeyEncrypted');
  });

  it('ativar um provedor desativa os outros do dono (exclusivo)', async () => {
    const { repo, ids, clock } = deps();
    const a = await add(repo, ids, clock).execute({
      ownerId: 'o1',
      label: 'A',
      backend: 'openai',
      baseUrl: 'https://x/v1',
      model: 'm',
      apiKey: 'key-abcdefgh',
    });
    const b = await add(repo, ids, clock).execute({
      ownerId: 'o1',
      label: 'B',
      backend: 'openai',
      baseUrl: 'https://y/v1',
      model: 'm',
      apiKey: 'key-abcdefgh',
    });

    const activate = new ActivateLlmProvider(repo);
    await activate.execute({ ownerId: 'o1', id: a.id });
    await activate.execute({ ownerId: 'o1', id: b.id });

    const list = await new ListLlmProviders(repo).execute({ ownerId: 'o1' });
    expect(list.filter((p) => p.isActive).map((p) => p.id)).toEqual([b.id]);
  });

  it('resolve o provedor ativo numa LlmConfig, decriptando a chave', async () => {
    const { repo, ids, clock } = deps();
    const v = await add(repo, ids, clock).execute({
      ownerId: 'o1',
      label: 'OpenRouter',
      backend: 'openai',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'x',
      apiKey: 'my-secret-key-1234',
    });
    await new ActivateLlmProvider(repo).execute({ ownerId: 'o1', id: v.id });

    const cfg = await new ResolveActiveLlmConfig(repo, fakeEncryptor).execute({ ownerId: 'o1' });
    expect(cfg).toEqual({
      backend: 'openai',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'x',
      apiKey: 'my-secret-key-1234',
    });
  });

  it('sem provedor ativo, ResolveActiveLlmConfig devolve null', async () => {
    const { repo } = deps();
    expect(
      await new ResolveActiveLlmConfig(repo, fakeEncryptor).execute({ ownerId: 'o1' }),
    ).toBeNull();
  });

  it('remover exige posse (forbidden para outro dono)', async () => {
    const { repo, ids, clock } = deps();
    const v = await add(repo, ids, clock).execute({
      ownerId: 'o1',
      label: 'A',
      backend: 'openai',
      baseUrl: 'https://x/v1',
      model: 'm',
      apiKey: 'key-abcdefgh',
    });
    await expect(
      new RemoveLlmProvider(repo).execute({ ownerId: 'intruso', id: v.id }),
    ).rejects.toBeInstanceOf(DomainError);
    // dono remove de fato
    await new RemoveLlmProvider(repo).execute({ ownerId: 'o1', id: v.id });
    expect(await repo.findById(v.id)).toBeNull();
  });
});

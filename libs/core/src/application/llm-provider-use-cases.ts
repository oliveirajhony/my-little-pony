import { DomainError } from '../domain/errors.js';
import { type LlmBackend, LlmProvider, type LlmProviderView } from '../domain/llm-provider.js';
import type { Clock, Encryptor, IdGenerator, LlmConfig, LlmProviderRepository } from './ports.js';

async function loadOwned(
  repo: LlmProviderRepository,
  id: string,
  ownerId: string,
): Promise<LlmProvider> {
  const provider = await repo.findById(id);
  if (!provider) throw new DomainError('llm-provider-not-found');
  if (!provider.isOwnedBy(ownerId)) throw new DomainError('forbidden');
  return provider;
}

/** Máscara de exibição da chave — nunca revela o segredo. */
export function apiKeyHint(key: string): string {
  const k = key.trim();
  return k.length < 8 ? '…' : `${k.slice(0, 4)}…${k.slice(-4)}`;
}

export class ListLlmProviders {
  constructor(private readonly repo: LlmProviderRepository) {}

  async execute(input: { ownerId: string }): Promise<LlmProviderView[]> {
    const providers = await this.repo.listByOwner(input.ownerId);
    return providers.map((p) => p.toView());
  }
}

export class AddLlmProvider {
  constructor(
    private readonly repo: LlmProviderRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly encryptor: Encryptor,
  ) {}

  async execute(input: {
    ownerId: string;
    label: string;
    backend: LlmBackend;
    baseUrl: string;
    model: string;
    apiKey?: string;
  }): Promise<LlmProviderView> {
    const key = input.apiKey?.trim() ?? '';
    const provider = LlmProvider.create({
      id: this.ids.next(),
      ownerId: input.ownerId,
      label: input.label,
      backend: input.backend,
      baseUrl: input.baseUrl,
      model: input.model,
      // A chave em claro NUNCA é persistida — só a versão cifrada + a máscara.
      apiKeyEncrypted: key ? this.encryptor.encrypt(key) : null,
      apiKeyHint: key ? apiKeyHint(key) : null,
      now: this.clock.now(),
    });
    await this.repo.save(provider);
    return provider.toView();
  }
}

export class ActivateLlmProvider {
  constructor(private readonly repo: LlmProviderRepository) {}

  async execute(input: { ownerId: string; id: string }): Promise<void> {
    const provider = await loadOwned(this.repo, input.id, input.ownerId);
    await this.repo.deactivateAllForOwner(input.ownerId);
    provider.activate();
    await this.repo.save(provider);
  }
}

export class RemoveLlmProvider {
  constructor(private readonly repo: LlmProviderRepository) {}

  async execute(input: { ownerId: string; id: string }): Promise<void> {
    const provider = await loadOwned(this.repo, input.id, input.ownerId);
    await this.repo.delete(provider.id);
  }
}

/**
 * Resolve o provedor ATIVO do dono numa `LlmConfig` (decriptando a chave), para
 * a geração usar. `null` quando não há ativo → o serviço cai no default do env.
 */
export class ResolveActiveLlmConfig {
  constructor(
    private readonly repo: LlmProviderRepository,
    private readonly encryptor: Encryptor,
  ) {}

  async execute(input: { ownerId: string }): Promise<LlmConfig | null> {
    const provider = await this.repo.findActive(input.ownerId);
    if (!provider) return null;
    return {
      backend: provider.backend,
      baseUrl: provider.baseUrl,
      model: provider.model,
      apiKey: provider.apiKeyEncrypted
        ? this.encryptor.decrypt(provider.apiKeyEncrypted)
        : undefined,
    };
  }
}

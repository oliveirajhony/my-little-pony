import { DomainError } from './errors.js';

/** Backend do LLM da geração. `openai` cobre qualquer endpoint compatível. */
export type LlmBackend = 'openai' | 'ollama';

export const LLM_BACKENDS: readonly LlmBackend[] = ['openai', 'ollama'];

export type LlmProviderProps = {
  id: string;
  ownerId: string;
  label: string;
  backend: LlmBackend;
  baseUrl: string;
  model: string;
  /** Chave de API CIFRADA (nunca em claro no domínio). Local sem chave => null. */
  apiKeyEncrypted: string | null;
  /** Máscara só para exibição (ex.: "sk-…039"). Nunca revela a chave. */
  apiKeyHint: string | null;
  isActive: boolean;
  createdAt: Date;
};

/** Vista pública de um provedor — sem o segredo cifrado. */
export type LlmProviderView = Omit<LlmProviderProps, 'apiKeyEncrypted'>;

/**
 * Um provedor de LLM configurado por um usuário (OpenAI/OpenRouter/Ollama…). A
 * chave já chega cifrada por um adapter (apps/api) — o domínio nunca vê o claro.
 */
export class LlmProvider {
  private constructor(private props: LlmProviderProps) {}

  static fromProps(props: LlmProviderProps): LlmProvider {
    return new LlmProvider(props);
  }

  static create(input: {
    id: string;
    ownerId: string;
    label: string;
    backend: LlmBackend;
    baseUrl: string;
    model: string;
    apiKeyEncrypted: string | null;
    apiKeyHint: string | null;
    now: Date;
  }): LlmProvider {
    const label = input.label.trim();
    const model = input.model.trim();
    const baseUrl = input.baseUrl.trim();
    if (!label || !model) throw new DomainError('invalid-llm-provider');
    if (!LLM_BACKENDS.includes(input.backend)) throw new DomainError('invalid-llm-provider');
    // openai exige base (o endpoint compatível); ollama tem default no serviço.
    if (input.backend === 'openai' && !baseUrl) throw new DomainError('invalid-llm-provider');
    return new LlmProvider({
      id: input.id,
      ownerId: input.ownerId,
      label,
      backend: input.backend,
      baseUrl,
      model,
      apiKeyEncrypted: input.apiKeyEncrypted,
      apiKeyHint: input.apiKeyHint,
      isActive: false,
      createdAt: input.now,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get ownerId(): string {
    return this.props.ownerId;
  }
  get isActive(): boolean {
    return this.props.isActive;
  }
  get backend(): LlmBackend {
    return this.props.backend;
  }
  get baseUrl(): string {
    return this.props.baseUrl;
  }
  get model(): string {
    return this.props.model;
  }
  get apiKeyEncrypted(): string | null {
    return this.props.apiKeyEncrypted;
  }

  isOwnedBy(ownerId: string): boolean {
    return this.props.ownerId === ownerId;
  }

  activate(): void {
    this.props.isActive = true;
  }

  deactivate(): void {
    this.props.isActive = false;
  }

  /** Vista pública (sem `apiKeyEncrypted`) — o que a API pode devolver. */
  toView(): LlmProviderView {
    const { apiKeyEncrypted: _omit, ...view } = this.props;
    return { ...view };
  }
}

import { Logger } from '@nestjs/common';

/**
 * Cliente HTTP compartilhado para o serviço Python (busca/RAG). Centraliza o que
 * os gateways (search e answer) repetiam: montagem de header + Bearer, timeout
 * (undici não tem timeout padrão) e log de falha visível. Cada gateway ainda
 * mapeia a resposta e decide seu fallback gracioso.
 */
export class PythonServiceClient {
  private readonly logger = new Logger(PythonServiceClient.name);

  constructor(
    private readonly serviceUrl: string,
    private readonly serviceToken: string,
    private readonly timeoutMs = 15_000,
  ) {}

  /** false quando SEARCH_SERVICE_URL está vazio (serviço ainda não implantado). */
  get configured(): boolean {
    return Boolean(this.serviceUrl);
  }

  /**
   * POST JSON e devolve o corpo parseado. Lança em não-OK / rede / timeout —
   * sempre registrando o motivo (uma falha configurada nunca pode virar sucesso
   * silencioso). O chamador traduz a exceção no seu fallback.
   */
  async postJson<T>(path: string, body: unknown): Promise<T> {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (this.serviceToken) headers.authorization = `Bearer ${this.serviceToken}`;
    let response: Response;
    try {
      response = await fetch(`${this.serviceUrl}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const reason =
        error instanceof Error && error.name === 'TimeoutError' ? 'timed out' : 'unreachable';
      this.logger.error(`python service ${reason} (POST ${path}): ${String(error)}`);
      throw error;
    }
    if (!response.ok) {
      this.logger.error(
        `python service returned ${response.status} ${response.statusText} (POST ${path})`,
      );
      throw new Error(`python service responded ${response.status}`);
    }
    return (await response.json()) as T;
  }
}

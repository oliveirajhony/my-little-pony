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

  /**
   * POST e devolve a Response CRUA (para consumir o corpo como stream — SSE).
   * `signal` externo (ex.: cliente desconectou) corta a request; senão aplica o
   * timeout padrão. Lança em não-OK / rede, sempre logando.
   */
  async postStream(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (this.serviceToken) headers.authorization = `Bearer ${this.serviceToken}`;
    let response: Response;
    try {
      response = await fetch(`${this.serviceUrl}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        // Se o chamador passa um signal (abort no disconnect), respeita-o; senão
        // usa o timeout padrão. Não misturamos os dois para não cortar um stream
        // longo e legítimo no meio.
        signal: signal ?? AbortSignal.timeout(this.timeoutMs),
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
    return response;
  }
}

/**
 * Parseia um corpo SSE (`text/event-stream`) em objetos JSON, um por frame
 * `data: {...}\n\n`. Tolerante a frames partidos entre chunks e a UTF-8
 * multibyte (`TextDecoder({stream:true})`). Ignora linhas não-`data:` (comentários
 * de heartbeat `:` etc.).
 */
export async function* parseSse<T>(response: Response): AsyncIterable<T> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // Frames separados por linha em branco (\r\n\r\n ou \n\n).
      for (;;) {
        const boundary = buffer.match(/\r?\n\r?\n/);
        if (boundary?.index === undefined) break;
        const frame = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        for (const line of frame.split(/\r?\n/)) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (data) yield JSON.parse(data) as T;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

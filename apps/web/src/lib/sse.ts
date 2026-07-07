/**
 * Parser de Server-Sent Events para o browser: consome o corpo de uma Response
 * (`text/event-stream`) e emite os objetos JSON, um por frame `data: {...}`.
 *
 * Tolerante a: frames partidos entre chunks; UTF-8 multibyte (`TextDecoder({stream})`);
 * CRLF (`\r\n`); linhas de comentário/heartbeat (`:` — ignoradas); e frames com
 * JSON malformado (pulados em vez de derrubar o stream). Encerra quando o corpo
 * termina ou o `signal` é abortado.
 */
export async function* parseSseStream<T>(
  response: Response,
  signal?: AbortSignal,
): AsyncIterable<T> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const onAbort = () => reader.cancel().catch(() => {});
  signal?.addEventListener('abort', onAbort, { once: true });

  function* emit(frame: string): Iterable<T> {
    for (const line of frame.split(/\r?\n/)) {
      if (!line.startsWith('data:')) continue; // ignora comentários `:` e outros campos
      const data = line.slice(5).trim();
      if (!data) continue;
      try {
        yield JSON.parse(data) as T;
      } catch {
        // frame malformado: pula, não derruba o stream
      }
    }
  }

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      for (;;) {
        const boundary = buffer.match(/\r?\n\r?\n/);
        if (boundary?.index === undefined) break;
        const frame = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        yield* emit(frame);
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) yield* emit(buffer); // último frame sem linha em branco final
  } finally {
    signal?.removeEventListener('abort', onAbort);
    await reader.cancel().catch(() => {});
  }
}

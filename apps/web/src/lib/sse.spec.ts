import { describe, expect, it } from 'vitest';
import { parseSseStream } from './sse';

async function collect<T>(it: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const ev of it) out.push(ev);
  return out;
}

type Ev = { type: string; text?: string };

describe('parseSseStream', () => {
  it('parses one JSON object per data frame, ignoring comments/heartbeats', () => {
    const body =
      ': keep-alive\n\n' + // comentário/heartbeat — ignorado
      'data: {"type":"status","stage":"retrieving"}\n\n' +
      'data: {"type":"token","text":"oi"}\n\n' +
      'data: {"type":"done"}\n\n';
    return collect<Ev>(parseSseStream(new Response(body))).then((events) => {
      expect(events.map((e) => e.type)).toEqual(['status', 'token', 'done']);
    });
  });

  it('handles a frame split across chunks and multibyte UTF-8', async () => {
    const full = 'data: {"type":"token","text":"café"}\n\ndata: {"type":"done"}\n\n';
    const bytes = new TextEncoder().encode(full);
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(bytes.slice(0, 20)); // corta no meio do "café" e do frame
        c.enqueue(bytes.slice(20));
        c.close();
      },
    });
    const events = await collect<Ev>(parseSseStream(new Response(body)));
    expect(events[0].text).toBe('café');
    expect(events.map((e) => e.type)).toEqual(['token', 'done']);
  });

  it('skips a malformed frame instead of killing the stream', async () => {
    const body =
      'data: {"type":"token","text":"a"}\n\n' +
      'data: {BROKEN\n\n' +
      'data: {"type":"token","text":"b"}\n\n';
    const events = await collect<Ev>(parseSseStream(new Response(body)));
    expect(events.map((e) => e.text)).toEqual(['a', 'b']);
  });

  it('delivers a final frame with no trailing blank line', async () => {
    const body = 'data: {"type":"token","text":"x"}\n\ndata: {"type":"done"}';
    const events = await collect<Ev>(parseSseStream(new Response(body)));
    expect(events.map((e) => e.type)).toEqual(['token', 'done']);
  });

  it('handles CRLF line endings', async () => {
    const body = 'data: {"type":"token","text":"z"}\r\n\r\n';
    const events = await collect<Ev>(parseSseStream(new Response(body)));
    expect(events[0].text).toBe('z');
  });
});

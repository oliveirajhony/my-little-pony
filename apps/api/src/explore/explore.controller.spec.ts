import type {
  AnswerQuestion,
  ExploreStreamEvent,
  ResolveActiveLlmConfig,
} from '@my-little-pony/core';
import { ValidationPipe } from '@nestjs/common';
import type { Response } from 'express';
import type { AnswerExporter } from './answer-exporter';
import { ExploreController, ExploreRequest } from './explore.controller';

// Estes testes exercitam só o stream; o exporter nunca é chamado aqui.
const stubExporter = {} as unknown as AnswerExporter;
// Sem provedor ativo → a geração usa o default do serviço.
const stubResolveLlm = { execute: async () => null } as unknown as ResolveActiveLlmConfig;

// Regressão: o ValidationPipe global usa whitelist:true, que REMOVE qualquer
// campo do body sem decorator do class-validator. Sem @IsString() no `q`, a
// pergunta era descartada e chegava vazia ao use case — o chat nunca respondia.
// Este teste falha se o decorator sumir de novo.
describe('ExploreRequest under the global ValidationPipe (whitelist)', () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true });

  it('keeps `q` in the body (would be stripped without a class-validator decorator)', async () => {
    const out = await pipe.transform(
      { q: 'quais os tipos de análise?' },
      { type: 'body', metatype: ExploreRequest },
    );
    expect(out).toBeInstanceOf(ExploreRequest);
    expect(out.q).toBe('quais os tipos de análise?');
  });

  it('rejects a non-string q', async () => {
    await expect(
      pipe.transform({ q: 123 }, { type: 'body', metatype: ExploreRequest }),
    ).rejects.toBeDefined();
  });
});

/** Response fake do Express: captura headers, frames escritos e o handler de close. */
function fakeRes() {
  const headers: Record<string, string> = {};
  const writes: string[] = [];
  let closeHandler: (() => void) | undefined;
  let ended = false;
  const res = {
    setHeader: (k: string, v: string) => {
      headers[k] = v;
    },
    flushHeaders: () => {},
    on: (event: string, cb: () => void) => {
      if (event === 'close') closeHandler = cb;
      return res;
    },
    write: (chunk: string) => {
      writes.push(chunk);
      return true;
    },
    end: () => {
      ended = true;
    },
  };
  return {
    res: res as unknown as Response,
    headers,
    writes,
    frames: () => writes.map((w) => JSON.parse(w.replace(/^data: /, '').replace(/\n\n$/, ''))),
    triggerClose: () => closeHandler?.(),
    isEnded: () => ended,
  };
}

function useCaseYielding(events: ExploreStreamEvent[], capture?: (input: unknown) => void) {
  return {
    stream: async function* (input: unknown) {
      capture?.(input);
      for (const ev of events) yield ev;
    },
  } as unknown as AnswerQuestion;
}

describe('ExploreController.stream (SSE)', () => {
  it('sets SSE headers, writes each event as a data frame and ends', async () => {
    const events: ExploreStreamEvent[] = [
      { type: 'status', stage: 'retrieving' },
      { type: 'token', text: 'oi' },
      { type: 'done', grounded: true },
    ];
    const r = fakeRes();
    const controller = new ExploreController(useCaseYielding(events), stubExporter, stubResolveLlm);

    await controller.stream({ id: 'u1' }, { q: 'oi' }, r.res);

    expect(r.headers['Content-Type']).toBe('text/event-stream');
    expect(r.headers['Cache-Control']).toBe('no-cache');
    expect(r.frames()).toEqual(events);
    expect(r.isEnded()).toBe(true);
  });

  it('always takes ownerId from the JWT user, never from the body', async () => {
    let seen: { ownerId?: string; q?: string } = {};
    const r = fakeRes();
    const controller = new ExploreController(
      useCaseYielding([{ type: 'done', grounded: false }], (input) => {
        seen = input as { ownerId: string; q: string };
      }),
      stubExporter,
      stubResolveLlm,
    );

    // Corpo tenta injetar outro ownerId — deve ser ignorado.
    await controller.stream({ id: 'u1' }, { q: 'oi', ownerId: 'attacker' } as never, r.res);

    expect(seen.ownerId).toBe('u1');
    expect(seen.q).toBe('oi');
  });

  it('emits a safe error frame when the stream throws', async () => {
    const throwing = {
      stream: async function* () {
        yield { type: 'status', stage: 'retrieving' } as ExploreStreamEvent;
        throw new Error('boom interno');
      },
    } as unknown as AnswerQuestion;
    const r = fakeRes();
    const controller = new ExploreController(throwing, stubExporter, stubResolveLlm);

    await controller.stream({ id: 'u1' }, { q: 'oi' }, r.res);

    const frames = r.frames();
    const err = frames.find((f) => f.type === 'error');
    expect(err).toBeDefined();
    expect(err.message).not.toContain('boom'); // mensagem fixa, sem detalhe interno
    expect(r.isEnded()).toBe(true);
  });

  it('aborts the upstream generation when the client disconnects (res close)', async () => {
    let signal: AbortSignal | undefined;
    const useCase = {
      stream: async function* (input: { signal?: AbortSignal }) {
        signal = input.signal;
        if (signal?.aborted) return; // já abortou antes do loop começar
        // trava até o abort — simula o LLM gerando enquanto o cliente sai.
        await new Promise<void>((resolve) => signal?.addEventListener('abort', () => resolve()));
      },
    } as unknown as AnswerQuestion;
    const r = fakeRes();
    const controller = new ExploreController(useCase, stubExporter, stubResolveLlm);

    const pending = controller.stream({ id: 'u1' }, { q: 'oi' }, r.res);
    // cliente desconecta no meio da geração:
    r.triggerClose();
    await pending;

    expect(signal?.aborted).toBe(true);
    expect(r.isEnded()).toBe(true);
  });
});

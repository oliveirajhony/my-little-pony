'use client';

import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { PublicDoc } from '../../lib/documents-api';
import { fullDate, relativeDate } from '../../lib/format-date';
import { DocIcon } from '../icons';
import { ContactForm } from './contact-form';
import { DocActions } from './doc-actions';
import { DocumentReader } from './document-reader';
import './published.css';
import { PublishedFooter } from './published-footer';
import { ReaderFullscreen } from './reader-fullscreen';
import { Reveal } from './reveal';
import { ThemeToggle } from './theme-toggle';

const REPO_URL = 'https://github.com/oliveirajhony/my-little-pony';
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.5;

export function PublishedDoc({ doc, ownerId }: { doc: PublicDoc; ownerId: string }) {
  const [zoom, setZoom] = useState(0.85);
  const [fullscreen, setFullscreen] = useState(false);
  const content = doc.content || `<p>${doc.excerpt}</p>`;

  return (
    <div className="published-page min-h-svh">
      <header
        data-print="hide"
        className="sticky top-0 z-30 border-b bg-background/70 backdrop-blur"
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <DocIcon className="size-[18px]" />
            </span>
            <span className="font-display text-sm font-semibold tracking-tight">
              my-little-pony
            </span>
          </a>
          <ThemeToggle />
        </div>
      </header>

      <main>
        <section data-print="hide" className="mx-auto max-w-3xl px-6 pt-14 pb-8 text-center">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-primary">Documento</p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {doc.title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              <time dateTime={doc.updatedAt} title={fullDate(doc.updatedAt)}>
                Atualizado {relativeDate(doc.updatedAt)}
              </time>
            </p>
            <div className="mt-6 flex justify-center">
              <DocActions
                ownerId={ownerId}
                slug={doc.slug}
                onFullscreen={() => setFullscreen(true)}
              />
            </div>
          </Reveal>
        </section>

        <section className="pb-16">
          <div
            data-print="hide"
            className="mx-auto mb-3 flex max-w-3xl items-center justify-end px-6"
          >
            <div className="flex items-center gap-1 rounded-full border bg-card px-1 py-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-full"
                aria-label="Diminuir zoom"
                onClick={() => setZoom((z) => Math.max(MIN_ZOOM, +(z - 0.15).toFixed(2)))}
              >
                <Minus />
              </Button>
              <span className="w-11 text-center font-mono text-xs text-muted-foreground tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-full"
                aria-label="Aumentar zoom"
                onClick={() => setZoom((z) => Math.min(MAX_ZOOM, +(z + 0.15).toFixed(2)))}
              >
                <Plus />
              </Button>
            </div>
          </div>
          <div className="mlp-scrollbar overflow-x-auto px-4">
            <DocumentReader content={content} zoom={zoom} />
          </div>
        </section>

        <section data-print="hide" className="border-t bg-card/30">
          <div className="mx-auto max-w-2xl px-6 py-14">
            <Reveal>
              <div className="text-center">
                <h2 className="font-display text-xl font-semibold tracking-tight">
                  Fale com a gente
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Dúvidas sobre este documento? Envie uma mensagem.
                </p>
              </div>
              <div className="mt-6">
                <ContactForm />
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <div data-print="hide">
        <PublishedFooter />
      </div>

      {fullscreen && (
        <ReaderFullscreen
          content={content}
          title={doc.title}
          onClose={() => setFullscreen(false)}
        />
      )}
    </div>
  );
}

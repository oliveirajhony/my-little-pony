'use client';

import { AlertCircle, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getArquivoBlob, type ImportedFile } from '../../lib/arquivos-api';

type LoadState = { status: 'loading' } | { status: 'missing' } | { status: 'ready'; blob: Blob };

/** Renderiza o conteúdo real do arquivo importado, por tipo. Só-leitura. */
export function DocumentViewer({ file, zoom = 1 }: { file: ImportedFile; zoom?: number }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    getArquivoBlob(file.id)
      .then((blob) => {
        if (alive) setState({ status: 'ready', blob });
      })
      .catch(() => {
        if (alive) setState({ status: 'missing' });
      });
    return () => {
      alive = false;
    };
  }, [file.id]);

  if (state.status === 'loading') {
    return (
      <Centered>
        <Loader2 className="size-5 animate-spin" />
        <span className="text-sm">Carregando pré-visualização…</span>
      </Centered>
    );
  }

  if (state.status === 'missing') {
    return (
      <Centered>
        <AlertCircle className="size-6 text-muted-foreground" />
        <p className="max-w-sm text-sm">Não foi possível carregar este arquivo. Tente novamente.</p>
      </Centered>
    );
  }

  switch (file.kind) {
    case 'pdf':
      return <PdfViewer blob={state.blob} name={file.name} zoom={zoom} />;
    case 'docx':
      return <DocxViewer blob={state.blob} zoom={zoom} />;
    case 'md':
      return <MarkdownViewer blob={state.blob} zoom={zoom} />;
    case 'html':
      return <HtmlViewer blob={state.blob} zoom={zoom} />;
    default:
      return (
        <Centered>
          <AlertCircle className="size-6 text-muted-foreground" />
          <p className="max-w-sm text-sm">
            O formato <strong>.doc</strong> (Word legado) não tem visualização no navegador.
            Converta para <strong>.docx</strong> ou PDF para pré-visualizar.
          </p>
        </Centered>
      );
  }
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
      {children}
    </div>
  );
}

/* ---------------------------------- PDF ----------------------------------- */

function PdfViewer({ blob, name, zoom }: { blob: Blob; name: string; zoom: number }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  if (!url) return null;
  // O viewer nativo do PDF entende o fragmento #zoom (percentual).
  const fragment = zoom === 1 ? '#view=FitH' : `#zoom=${Math.round(zoom * 100)}`;
  return (
    <iframe
      key={fragment}
      src={`${url}${fragment}`}
      title={name}
      className="h-full w-full border-0 bg-white"
    />
  );
}

/* --------------------------------- DOCX ----------------------------------- */

function DocxViewer({ blob, zoom }: { blob: Blob; zoom: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    const container = containerRef.current;
    if (!container) return;
    setError(false);
    // Import dinâmico: docx-preview toca no DOM, então só no cliente.
    import('docx-preview')
      .then(({ renderAsync }) => {
        if (!alive || !containerRef.current) return;
        containerRef.current.innerHTML = '';
        return renderAsync(blob, containerRef.current, undefined, {
          className: 'docx',
          inWrapper: true,
        });
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [blob]);

  return (
    <div className="h-full overflow-auto bg-muted/40">
      {error && (
        <Centered>
          <AlertCircle className="size-6 text-muted-foreground" />
          <p className="max-w-sm text-sm">Não foi possível renderizar este DOCX.</p>
        </Centered>
      )}
      <div ref={containerRef} className="docx-host" style={{ zoom }} />
    </div>
  );
}

/* -------------------------------- Markdown -------------------------------- */

function MarkdownViewer({ blob, zoom }: { blob: Blob; zoom: number }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    blob.text().then((t) => alive && setText(t));
    return () => {
      alive = false;
    };
  }, [blob]);

  if (text === null) return null;
  return (
    <div className="h-full overflow-auto bg-muted/30">
      <div
        style={{ zoom }}
        className={
          'mx-auto my-6 max-w-[75ch] rounded-lg border bg-background px-8 py-10 text-[15px] leading-relaxed shadow-sm ' +
          '[&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground ' +
          '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] ' +
          '[&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:font-display [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold ' +
          '[&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_hr]:my-6 [&_hr]:border-border ' +
          '[&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_pre]:my-4 [&_pre]:overflow-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 ' +
          '[&_table]:my-4 [&_table]:w-full [&_td]:border [&_td]:px-3 [&_td]:py-1.5 [&_th]:border [&_th]:bg-muted [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left ' +
          '[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_:first-child]:mt-0'
        }
      >
        <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
      </div>
    </div>
  );
}

/* ---------------------------------- HTML ---------------------------------- */

function HtmlViewer({ blob, zoom }: { blob: Blob; zoom: number }) {
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    blob.text().then((t) => alive && setHtml(t));
    return () => {
      alive = false;
    };
  }, [blob]);

  if (html === null) return null;
  return (
    // sandbox sem allow-scripts: renderiza o HTML mas neutraliza scripts.
    <iframe
      title="Pré-visualização HTML"
      sandbox=""
      srcDoc={html}
      style={{ zoom }}
      className="h-full w-full border-0 bg-white"
    />
  );
}

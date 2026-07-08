import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { ChatMessage, ChatSource } from '../../lib/explore-store';

// next/link needs the app-router context to render; a plain anchor keeps the
// href assertions honest without mounting a router.
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// A exportação bate na API + dispara download no browser — isola os dois.
vi.mock('../../lib/explore-api', () => ({
  exportAnswer: vi.fn().mockResolvedValue(new Blob(['x'])),
}));
vi.mock('../../lib/download', () => ({ downloadBlob: vi.fn() }));

import { downloadBlob } from '../../lib/download';
import { exportAnswer } from '../../lib/explore-api';
import { MessageBubble } from './explore-view';

const source = (over: Partial<ChatSource> = {}): ChatSource => ({
  id: 's0',
  documentId: 'd1',
  kind: 'native',
  title: 'Doc Nativo',
  snippet: 'trecho do documento',
  slug: 'doc-nativo',
  ...over,
});

const assistant = (over: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'a',
  role: 'assistant',
  content: '',
  createdAt: 'now',
  ...over,
});

describe('MessageBubble — citações inline', () => {
  it('turns [n] markers into links to the mapped source (native → editor, file → arquivos)', () => {
    render(
      <MessageBubble
        message={assistant({
          content: 'Alpha [1] e beta [2].',
          sources: [
            source(),
            source({
              id: 's1',
              documentId: 'd2',
              kind: 'file',
              title: 'Arquivo PDF',
              slug: null,
            }),
          ],
        })}
      />,
    );

    expect(screen.getByRole('link', { name: /Citação 1: Doc Nativo/ })).toHaveAttribute(
      'href',
      '/app/editor?id=d1',
    );
    expect(screen.getByRole('link', { name: /Citação 2: Arquivo PDF/ })).toHaveAttribute(
      'href',
      '/app/arquivos?file=d2',
    );
  });

  it('renders a compact sources line with the count', () => {
    render(
      <MessageBubble
        message={assistant({
          content: 'x [1]',
          sources: [source(), source({ id: 's1', documentId: 'd2', title: 'Outro' })],
        })}
      />,
    );
    expect(screen.getByText('2 fontes')).toBeInTheDocument();
  });

  it('dedupes the compact line by document (chunks of the same doc → one pill, "1 fonte")', () => {
    render(
      <MessageBubble
        message={assistant({
          content: 'x [1] y [2]',
          sources: [
            source({ id: 's0', documentId: 'd1', title: 'Doc Nativo' }),
            source({ id: 's1', documentId: 'd1', title: 'Doc Nativo' }),
          ],
        })}
      />,
    );
    // Contador conta documentos únicos, não trechos.
    expect(screen.getByText('1 fonte')).toBeInTheDocument();
    // Uma única pílula (o link cujo nome é exatamente o título); os chips inline
    // têm nome "Citação N: …" e não colidem.
    expect(screen.getAllByRole('link', { name: 'Doc Nativo' })).toHaveLength(1);
    // As citações inline seguem mapeando o trecho exato (não são deduplicadas).
    expect(screen.getByRole('link', { name: /Citação 2: Doc Nativo/ })).toBeInTheDocument();
  });

  it('leaves [n] as plain text when there is no matching source', () => {
    render(
      <MessageBubble message={assistant({ content: 'sem fonte [3].', sources: [source()] })} />,
    );
    expect(screen.queryByRole('link', { name: /Citação 3/ })).toBeNull();
    expect(screen.getByText(/\[3\]/)).toBeInTheDocument();
  });

  it('no longer renders the old top "Fontes" block header', () => {
    render(<MessageBubble message={assistant({ content: 'oi', sources: [source()] })} />);
    expect(screen.queryByText('Fontes')).toBeNull();
  });

  it('opens the hover card on focus and closes it on Escape (keyboard)', async () => {
    const user = userEvent.setup();
    render(<MessageBubble message={assistant({ content: 'texto [1].', sources: [source()] })} />);

    // Tab até o chip da citação; o card abre no focus (Radix HoverCard).
    await user.tab();
    expect(screen.getByRole('link', { name: /Citação 1: Doc Nativo/ })).toHaveFocus();

    const openLink = await screen.findByRole('link', { name: 'Abrir documento' });
    expect(openLink).toHaveAttribute('href', '/app/editor?id=d1');

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Abrir documento' })).toBeNull());
  });
});

describe('MessageBubble — caret de streaming (#47)', () => {
  it('renderiza o caret inline (dentro do último parágrafo) durante a geração', () => {
    const { container } = render(
      <MessageBubble message={assistant({ content: 'Gerando texto', streaming: true })} />,
    );
    const caret = container.querySelector('[data-caret]');
    expect(caret).not.toBeNull();
    // Inline no mesmo fluxo do texto — não é um bloco solto abaixo.
    expect(caret?.closest('p')).not.toBeNull();
  });

  it('não renderiza o caret quando a resposta está concluída', () => {
    const { container } = render(
      <MessageBubble message={assistant({ content: 'Resposta final' })} />,
    );
    expect(container.querySelector('[data-caret]')).toBeNull();
  });
});

describe('MessageBubble — barra de ações / copiar (#48)', () => {
  it('copia o texto da resposta e mostra o feedback "Copiado"', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    render(<MessageBubble message={assistant({ content: 'Resposta para copiar' })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar resposta' }));

    expect(writeText).toHaveBeenCalledWith('Resposta para copiar');
    expect(await screen.findByText('Copiado')).toBeInTheDocument();
  });

  it('baixa a resposta em PDF pelo menu Baixar (formato + título + conteúdo)', async () => {
    const user = userEvent.setup();
    vi.mocked(exportAnswer).mockClear();
    vi.mocked(downloadBlob).mockClear();
    render(
      <MessageBubble
        message={assistant({ content: 'Resposta final' })}
        chatTitle="Minha pergunta"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Baixar resposta' }));
    await user.click(await screen.findByRole('menuitem', { name: 'PDF' }));

    expect(exportAnswer).toHaveBeenCalledWith({
      format: 'pdf',
      title: 'Minha pergunta',
      content: 'Resposta final',
    });
    await waitFor(() => expect(downloadBlob).toHaveBeenCalled());
    // o nome do arquivo sai do título do chat
    expect(vi.mocked(downloadBlob).mock.calls[0][1]).toBe('Minha pergunta.pdf');
  });

  it('oferece Markdown como opção de download', async () => {
    const user = userEvent.setup();
    vi.mocked(exportAnswer).mockClear();
    render(<MessageBubble message={assistant({ content: 'x' })} chatTitle="T" />);

    await user.click(screen.getByRole('button', { name: 'Baixar resposta' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Markdown' }));

    expect(exportAnswer).toHaveBeenCalledWith({ format: 'md', title: 'T', content: 'x' });
  });

  it('não mostra a barra de ações enquanto a resposta está sendo gerada', () => {
    render(<MessageBubble message={assistant({ content: 'parcial', streaming: true })} />);
    expect(screen.queryByRole('button', { name: 'Copiar resposta' })).toBeNull();
  });
});

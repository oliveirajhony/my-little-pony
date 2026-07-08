import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchResult } from '../../lib/search-api';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('../../lib/search-api', () => ({ searchDocuments: vi.fn() }));

import { searchDocuments } from '../../lib/search-api';
import { BuscaView } from './busca-view';

const mockSearch = vi.mocked(searchDocuments);

const hit = (over: Partial<SearchResult> = {}): SearchResult => ({
  documentId: 'd1',
  score: 0.9,
  snippet: 'trecho relevante sobre o tema',
  kind: 'native',
  title: 'Doc Nativo',
  slug: 'doc-nativo',
  ...over,
});

describe('BuscaView', () => {
  beforeEach(() => mockSearch.mockReset());

  it('busca ao enviar e renderiza os resultados com links certos (native → editor, file → arquivos)', async () => {
    const user = userEvent.setup();
    mockSearch.mockResolvedValue([
      hit(),
      hit({ documentId: 'd2', kind: 'file', title: 'Arquivo PDF', slug: null }),
    ]);

    render(<BuscaView />);
    await user.type(screen.getByRole('searchbox'), 'análise de dados');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(mockSearch).toHaveBeenCalledWith('análise de dados');
    expect(await screen.findByRole('link', { name: /Doc Nativo/ })).toHaveAttribute(
      'href',
      '/app/editor?id=d1',
    );
    expect(screen.getByRole('link', { name: /Arquivo PDF/ })).toHaveAttribute(
      'href',
      '/app/arquivos?file=d2',
    );
  });

  it('não busca quando o campo está vazio', async () => {
    const user = userEvent.setup();
    render(<BuscaView />);

    await user.type(screen.getByRole('searchbox'), '   ');
    await user.keyboard('{Enter}');

    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('mostra "nada encontrado" quando a busca volta vazia', async () => {
    const user = userEvent.setup();
    mockSearch.mockResolvedValue([]);
    render(<BuscaView />);

    await user.type(screen.getByRole('searchbox'), 'xyzzy');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByText(/[Nn]ada encontrado/)).toBeInTheDocument();
  });
});

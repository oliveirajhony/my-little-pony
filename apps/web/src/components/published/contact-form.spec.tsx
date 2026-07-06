import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContactForm } from './contact-form';

const props = { ownerId: 'u1', slug: 'guia' };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ContactForm', () => {
  it('exige nome e mensagem', async () => {
    const user = userEvent.setup();
    render(<ContactForm {...props} />);
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
    expect(await screen.findByText(/Preencha nome e mensagem/)).toBeInTheDocument();
  });

  it('valida o formato do e-mail', async () => {
    const user = userEvent.setup();
    render(<ContactForm {...props} />);
    await user.type(screen.getByLabelText('Nome'), 'Ana');
    await user.type(screen.getByLabelText('Mensagem'), 'Olá');
    await user.type(screen.getByLabelText('E-mail'), 'nope');
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
    expect(await screen.findByText(/e-mail válido/)).toBeInTheDocument();
  });

  it('envia e mostra sucesso quando tudo é válido', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<ContactForm {...props} />);
    await user.type(screen.getByLabelText('Nome'), 'Ana');
    await user.type(screen.getByLabelText('E-mail'), 'ana@email.com');
    await user.type(screen.getByLabelText('Mensagem'), 'Olá, tudo bem?');
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
    expect(await screen.findByText(/Mensagem enviada/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/public/documents/u1/guia/contact'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from './login-form';

const state = {
  status: 'guest' as 'guest' | 'authed' | 'loading',
  login: vi.fn(),
  register: vi.fn(),
};

vi.mock('../../lib/auth-store', () => ({
  useAuth: (selector: (s: typeof state) => unknown) => selector(state),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

beforeEach(() => {
  state.status = 'guest';
  state.login = vi.fn().mockResolvedValue(undefined);
  state.register = vi.fn().mockResolvedValue(undefined);
});

describe('LoginForm', () => {
  it('rejeita e-mail malformado sem chamar o backend', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText('E-mail'), 'nope');
    await user.type(screen.getByLabelText('Senha'), '123456');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText(/Confira o e-mail/)).toBeInTheDocument();
    expect(state.login).not.toHaveBeenCalled();
  });

  it('mostra a mensagem de erro do backend', async () => {
    state.login = vi
      .fn()
      .mockRejectedValue({ status: 401, message: 'E-mail ou senha incorretos.' });
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText('E-mail'), 'a@b.com');
    await user.type(screen.getByLabelText('Senha'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText(/incorretos/)).toBeInTheDocument();
  });

  it('faz login com sucesso e confirma', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText('E-mail'), 'a@b.com');
    await user.type(screen.getByLabelText('Senha'), '123456');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Tudo certo!')).toBeInTheDocument();
    expect(state.login).toHaveBeenCalledWith('a@b.com', '123456');
  });

  it('alterna para o cadastro (mostra o campo Nome)', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    expect(screen.queryByLabelText('Nome')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(screen.getByLabelText('Nome')).toBeInTheDocument();
  });

  it('alterna a visibilidade da senha', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    const password = screen.getByLabelText('Senha');
    expect(password).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(password).toHaveAttribute('type', 'text');
  });
});

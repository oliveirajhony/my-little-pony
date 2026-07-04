import { render, screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LoginForm } from './login-form';

async function fillAndSubmit(user: UserEvent, email: string, password: string) {
  await user.type(screen.getByLabelText('E-mail'), email);
  await user.type(screen.getByLabelText('Senha'), password);
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('LoginForm', () => {
  it('rejects a malformed email', async () => {
    const user = userEvent.setup();
    render(<LoginForm authDelayMs={0} />);
    await fillAndSubmit(user, 'nope', '123456');
    expect(await screen.findByText(/Confira o e-mail/)).toBeInTheDocument();
  });

  it('shows an error for wrong credentials', async () => {
    const user = userEvent.setup();
    render(<LoginForm authDelayMs={0} />);
    await fillAndSubmit(user, 'demo@mlp.app', 'wrong');
    expect(await screen.findByText(/incorretos/)).toBeInTheDocument();
  });

  it('succeeds with the demo credentials', async () => {
    const user = userEvent.setup();
    render(<LoginForm authDelayMs={0} />);
    await fillAndSubmit(user, 'demo@mlp.app', '123456');
    expect(await screen.findByText('Tudo certo!')).toBeInTheDocument();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<LoginForm authDelayMs={0} />);
    const password = screen.getByLabelText('Senha');
    expect(password).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(password).toHaveAttribute('type', 'text');
  });
});

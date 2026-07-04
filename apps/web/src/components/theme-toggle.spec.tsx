import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from './theme-provider';
import { ThemeToggle } from './theme-toggle';

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe('ThemeToggle', () => {
  it('renders the three theme options', () => {
    renderToggle();
    expect(screen.getByRole('button', { name: 'Claro' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Escuro' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sistema' })).toBeInTheDocument();
  });

  it('marks the clicked theme as pressed', async () => {
    const user = userEvent.setup();
    renderToggle();

    await user.click(screen.getByRole('button', { name: 'Escuro' }));

    expect(
      await screen.findByRole('button', { name: 'Escuro', pressed: true }),
    ).toBeInTheDocument();
  });
});

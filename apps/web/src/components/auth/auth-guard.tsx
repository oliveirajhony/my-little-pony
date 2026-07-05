'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';
import { useAuth } from '../../lib/auth-store';

/**
 * Protege a área logada: enquanto o silent-refresh resolve, mostra um estado de
 * carregamento; se o usuário for visitante, redireciona para o login.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const status = useAuth((s) => s.status);
  const router = useRouter();

  useEffect(() => {
    if (status === 'guest') router.replace('/');
  }, [status, router]);

  if (status !== 'authed') {
    return (
      <div className="grid min-h-svh place-items-center bg-background text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  return <>{children}</>;
}

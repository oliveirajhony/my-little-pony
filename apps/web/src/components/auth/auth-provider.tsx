'use client';

import { type ReactNode, useEffect } from 'react';
import { useAuth } from '../../lib/auth-store';

/**
 * Dispara o silent-refresh uma vez ao montar o app: recupera a sessão a partir
 * do cookie httpOnly de refresh, ou marca o usuário como visitante.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const hydrate = useAuth((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return <>{children}</>;
}

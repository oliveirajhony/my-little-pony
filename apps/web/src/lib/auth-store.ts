'use client';

import { create } from 'zustand';
import { apiFetch, authFetch, configureApiClient } from './api-client';

export type AuthUser = { id: string; name: string; email: string; avatarUrl: string | null };
export type AuthStatus = 'loading' | 'authed' | 'guest';

type SessionResponse = { user: AuthUser; accessToken: string };

// Single-flight do refresh: quando o access token expira, várias requisições em
// voo recebem 401 ~ao mesmo tempo e chamariam /auth/refresh em paralelo. Com
// rotação do refresh token, essas chamadas concorrentes invalidam umas às outras
// e derrubam a sessão. Compartilhando uma única promise, todas esperam o mesmo
// refresh.
let refreshInFlight: Promise<boolean> | null = null;

type AuthState = {
  user: AuthUser | null;
  /** Guardado só em memória (não em localStorage) — seguro contra XSS. */
  accessToken: string | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Renova o access token pelo cookie de refresh. Retorna se conseguiu. */
  refresh: () => Promise<boolean>;
  /** Silent-refresh na carga do app: recupera a sessão ou marca guest. */
  hydrate: () => Promise<void>;
  updateProfile: (input: {
    name?: string;
    email?: string;
    avatarUrl?: string | null;
    /** Obrigatória (verificada no backend) quando o e-mail muda. */
    currentPassword?: string;
  }) => Promise<void>;
  changePassword: (input: { current: string; next: string }) => Promise<void>;
  uploadAvatarFile: (file: File) => Promise<void>;
  uploadAvatarFromUrl: (url: string) => Promise<void>;
  removeAvatar: () => Promise<void>;
};

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  status: 'loading',

  login: async (email, password) => {
    const res = await authFetch<SessionResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    set({ user: res.user, accessToken: res.accessToken, status: 'authed' });
  },

  register: async (name, email, password) => {
    const res = await authFetch<SessionResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    set({ user: res.user, accessToken: res.accessToken, status: 'authed' });
  },

  logout: async () => {
    try {
      await authFetch('/auth/logout', { method: 'POST' });
    } catch {
      // Encerrar a sessão local vale mesmo se a chamada falhar.
    }
    set({ user: null, accessToken: null, status: 'guest' });
  },

  refresh: () => {
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = (async () => {
      try {
        const { accessToken } = await authFetch<{ accessToken: string }>('/auth/refresh', {
          method: 'POST',
        });
        set({ accessToken });
        return true;
      } catch {
        set({ user: null, accessToken: null, status: 'guest' });
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
    return refreshInFlight;
  },

  hydrate: async () => {
    if (!(await get().refresh())) {
      set({ status: 'guest' });
      return;
    }
    try {
      const user = await apiFetch<AuthUser>('/users/me');
      set({ user, status: 'authed' });
    } catch {
      set({ user: null, accessToken: null, status: 'guest' });
    }
  },

  updateProfile: async (input) => {
    const user = await apiFetch<AuthUser>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    set({ user });
  },

  changePassword: async (input) => {
    await apiFetch('/users/me/password', { method: 'PATCH', body: JSON.stringify(input) });
  },

  uploadAvatarFile: async (file) => {
    const form = new FormData();
    form.append('file', file);
    const user = await apiFetch<AuthUser>('/users/me/avatar', { method: 'POST', body: form });
    set({ user });
  },

  uploadAvatarFromUrl: async (url) => {
    const user = await apiFetch<AuthUser>('/users/me/avatar/from-url', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
    set({ user });
  },

  removeAvatar: async () => {
    const user = await apiFetch<AuthUser>('/users/me/avatar', { method: 'DELETE' });
    set({ user });
  },
}));

// Liga o cliente HTTP ao store: o Bearer e o refresh no 401 leem daqui.
configureApiClient({
  getAccessToken: () => useAuth.getState().accessToken,
  refreshSession: () => useAuth.getState().refresh(),
});

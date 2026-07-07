import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from './auth-store';

const USER = { id: '1', name: 'Ana', email: 'a@b.com', avatarUrl: null };

function mockFetch(response: { ok: boolean; status: number; body: unknown }) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: response.ok,
      status: response.status,
      json: async () => response.body,
    }),
  );
}

beforeEach(() => {
  useAuth.setState({ user: null, accessToken: null, status: 'loading' });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('auth-store', () => {
  it('login guarda user + accessToken e marca authed', async () => {
    mockFetch({ ok: true, status: 200, body: { user: USER, accessToken: 'tok' } });
    await useAuth.getState().login('a@b.com', '123456');
    const s = useAuth.getState();
    expect(s.status).toBe('authed');
    expect(s.accessToken).toBe('tok');
    expect(s.user?.name).toBe('Ana');
  });

  it('login com erro rejeita com a mensagem do backend', async () => {
    mockFetch({
      ok: false,
      status: 401,
      body: { code: 'bad-credentials', message: 'E-mail ou senha incorretos.' },
    });
    await expect(useAuth.getState().login('a@b.com', 'x')).rejects.toMatchObject({
      status: 401,
      message: 'E-mail ou senha incorretos.',
    });
  });

  it('logout limpa a sessão', async () => {
    useAuth.setState({ user: USER, accessToken: 'tok', status: 'authed' });
    mockFetch({ ok: true, status: 200, body: { ok: true } });
    await useAuth.getState().logout();
    const s = useAuth.getState();
    expect(s.status).toBe('guest');
    expect(s.accessToken).toBeNull();
    expect(s.user).toBeNull();
  });

  it('refresh falho marca guest', async () => {
    mockFetch({ ok: false, status: 401, body: { message: 'Sessão não encontrada.' } });
    const ok = await useAuth.getState().refresh();
    expect(ok).toBe(false);
    expect(useAuth.getState().status).toBe('guest');
  });

  it('refresh concorrente dispara uma única chamada (single-flight)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ accessToken: 'novo' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    // Duas requisições que levaram 401 ao mesmo tempo chamam refresh em paralelo.
    const [a, b] = await Promise.all([useAuth.getState().refresh(), useAuth.getState().refresh()]);

    expect(a).toBe(true);
    expect(b).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1); // não N chamadas a /auth/refresh
    expect(useAuth.getState().accessToken).toBe('novo');
  });

  it('refresh em voo é recriado após concluir', async () => {
    mockFetch({ ok: true, status: 200, body: { accessToken: 't1' } });
    await useAuth.getState().refresh();
    mockFetch({ ok: true, status: 200, body: { accessToken: 't2' } });
    await useAuth.getState().refresh();
    expect(useAuth.getState().accessToken).toBe('t2');
  });
});

/**
 * Cliente HTTP do backend Nest. Duas portas:
 * - `authFetch`: chamadas cruas de `/auth/*` (sem Bearer, sem retry).
 * - `apiFetch`: rotas protegidas — injeta `Authorization: Bearer` e, no 401,
 *   tenta o refresh uma vez e repete.
 * Ambas usam `credentials: 'include'` para o cookie httpOnly de refresh.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

export type ApiError = { status: number; code?: string; message: string };

function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && 'status' in value && 'message' in value;
}

/** Type guard para tratar erros vindos do cliente na UI. */
export function asApiError(value: unknown): ApiError | null {
  return isApiError(value) ? value : null;
}

// Injetados pelo auth-store (evita import circular).
let getAccessToken: () => string | null = () => null;
let refreshSession: () => Promise<boolean> = async () => false;

export function configureApiClient(deps: {
  getAccessToken: () => string | null;
  refreshSession: () => Promise<boolean>;
}): void {
  getAccessToken = deps.getAccessToken;
  refreshSession = deps.refreshSession;
}

async function toResult<T>(res: Response): Promise<T> {
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const error: ApiError = {
      status: res.status,
      code: (data as { code?: string } | null)?.code,
      message: (data as { message?: string } | null)?.message ?? 'Algo deu errado. Tente de novo.',
    };
    throw error;
  }
  return data as T;
}

function jsonInit(options: RequestInit): RequestInit {
  return {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  };
}

/** Rotas de autenticação (`/auth/*`): sem Bearer e sem retry de refresh. */
export function authFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  return fetch(`${API_BASE}${path}`, jsonInit(options)).then(toResult<T>);
}

/** Rotas protegidas: injeta o access token e renova no 401 (uma vez). */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const send = () => {
    const token = getAccessToken();
    const init = jsonInit(options);
    return fetch(`${API_BASE}${path}`, {
      ...init,
      headers: token ? { ...init.headers, Authorization: `Bearer ${token}` } : init.headers,
    });
  };

  let res = await send();
  if (res.status === 401 && (await refreshSession())) {
    res = await send();
  }
  return toResult<T>(res);
}

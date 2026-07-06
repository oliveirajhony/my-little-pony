/**
 * Cliente HTTP do backend Nest. Duas portas:
 * - `authFetch`: chamadas cruas de `/auth/*` (sem Bearer, sem retry).
 * - `apiFetch`: rotas protegidas — injeta `Authorization: Bearer` e, no 401,
 *   tenta o refresh uma vez e repete.
 * Ambas usam `credentials: 'include'` para o cookie httpOnly de refresh.
 */

// URL pública da API — a que o BROWSER enxerga. Use para QUALQUER URL que chegue
// ao cliente: fetch no navegador, href de download, etc. É idêntica no servidor e
// no cliente, então é segura para hidratação (não pode divergir no SSR).
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

// URL interna (rede do Docker) para chamadas server-to-server no SSR, onde
// `localhost` seria o próprio container do web. Só existe no servidor: no browser
// `API_URL_INTERNAL` é undefined e caímos na pública. NUNCA renderize esta URL no
// HTML — ela quebra a hidratação (server vê `http://api:3333`, cliente vê a pública).
export const API_INTERNAL_BASE = process.env.API_URL_INTERNAL || API_BASE;

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

function baseInit(options: RequestInit): RequestInit {
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
  return {
    ...options,
    credentials: 'include',
    // FormData define seu próprio Content-Type (boundary) — não sobrescrever.
    headers: isForm
      ? (options.headers ?? {})
      : { 'Content-Type': 'application/json', ...options.headers },
  };
}

/** Rotas de autenticação (`/auth/*`): sem Bearer e sem retry de refresh. */
export function authFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  return fetch(`${API_BASE}${path}`, baseInit(options)).then(toResult<T>);
}

/** Rotas protegidas: injeta o access token e renova no 401 (uma vez). */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const send = () => {
    const token = getAccessToken();
    const init = baseInit(options);
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

/** Como `apiFetch`, mas devolve o corpo como Blob (download/preview binário). */
export async function apiFetchBlob(path: string, options: RequestInit = {}): Promise<Blob> {
  const send = () => {
    const token = getAccessToken();
    const init = baseInit(options);
    return fetch(`${API_BASE}${path}`, {
      ...init,
      headers: token ? { ...init.headers, Authorization: `Bearer ${token}` } : init.headers,
    });
  };

  let res = await send();
  if (res.status === 401 && (await refreshSession())) {
    res = await send();
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const error: ApiError = {
      status: res.status,
      code: (data as { code?: string } | null)?.code,
      message:
        (data as { message?: string } | null)?.message ?? 'Não foi possível abrir o arquivo.',
    };
    throw error;
  }
  return res.blob();
}

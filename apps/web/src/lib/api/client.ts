import type { RefreshResponse } from '@quill-collab/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

let accessToken: string | null = null;
let refreshInflight: Promise<string | null> | null = null;
const subscribers = new Set<(token: string | null) => void>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  for (const fn of subscribers) fn(token);
}

export function subscribeAccessToken(
  fn: (token: string | null) => void,
): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshInflight) {
    refreshInflight = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) {
          setAccessToken(null);
          return null;
        }
        const data = (await res.json()) as RefreshResponse;
        setAccessToken(data.accessToken);
        return data.accessToken;
      } catch {
        setAccessToken(null);
        return null;
      } finally {
        refreshInflight = null;
      }
    })();
  }
  return refreshInflight;
}

export interface ApiError extends Error {
  status: number;
  body: unknown;
}

function makeError(status: number, body: unknown): ApiError {
  const message =
    (typeof body === 'object' &&
      body &&
      'message' in body &&
      typeof (body as { message: unknown }).message === 'string' &&
      ((body as { message: string }).message as string)) ||
    `Request failed with status ${status}`;
  const err = new Error(message) as ApiError;
  err.status = status;
  err.body = body;
  return err;
}

export interface ApiOptions extends RequestInit {
  json?: unknown;
  // Skip auto-refresh on 401 (used by /auth/refresh itself).
  skipAuthRefresh?: boolean;
  // Skip the Authorization header (used by /auth/login, /auth/register).
  anonymous?: boolean;
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { json, skipAuthRefresh, anonymous, headers, body, ...rest } = opts;

  const buildInit = (token: string | null): RequestInit => {
    const h = new Headers(headers);
    if (json !== undefined) h.set('Content-Type', 'application/json');
    if (!anonymous && token) h.set('Authorization', `Bearer ${token}`);
    return {
      ...rest,
      credentials: 'include',
      headers: h,
      body: json !== undefined ? JSON.stringify(json) : body,
    };
  };

  let res = await fetch(`${API_URL}${path}`, buildInit(accessToken));

  if (res.status === 401 && !skipAuthRefresh && !anonymous) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await fetch(`${API_URL}${path}`, buildInit(newToken));
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw makeError(res.status, body);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * Client-side fetch helpers for API mutations.
 *
 * No CSRF token is sent — the browser automatically attaches the `Origin`
 * header, which the server validates. Same-origin fetch sends credentials
 * (the session cookie) by default.
 */

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  details?: unknown;
}

export async function apiFetch<T = unknown>(
  url: string,
  options: RequestInit = {},
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    const body = isJson ? await res.json() : undefined;
    if (!res.ok) {
      return { ok: false, status: res.status, error: body?.error || `Request failed (${res.status})`, details: body?.details };
    }
    return { ok: true, status: res.status, data: body as T };
  } catch (err) {
    return { ok: false, status: 0, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function apiPost<T = unknown>(url: string, body: unknown): Promise<ApiResult<T>> {
  return apiFetch<T>(url, { method: 'POST', body: JSON.stringify(body) });
}

export async function apiGet<T = unknown>(url: string): Promise<ApiResult<T>> {
  return apiFetch<T>(url, { method: 'GET' });
}

export async function apiPut<T = unknown>(url: string, body: unknown): Promise<ApiResult<T>> {
  return apiFetch<T>(url, { method: 'PUT', body: JSON.stringify(body) });
}

export async function apiPatch<T = unknown>(url: string, body: unknown): Promise<ApiResult<T>> {
  return apiFetch<T>(url, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function apiDelete<T = unknown>(url: string): Promise<ApiResult<T>> {
  return apiFetch<T>(url, { method: 'DELETE' });
}
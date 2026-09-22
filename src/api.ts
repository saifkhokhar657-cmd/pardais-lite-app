import { auth } from './firebase';

const API_BASE = (import.meta.env.DEV ? (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080') : (import.meta.env.VITE_API_BASE_URL || 'https://api.pardaislite.soulverseapps.com')).replace(/\/$/, '');

async function headers(contentType = false) {
  const h: Record<string, string> = { Accept: 'application/json' };
  if (contentType) h['Content-Type'] = 'application/json';
  const user = auth.currentUser;
  if (user) h.Authorization = `Bearer ${await user.getIdToken()}`;
  return h;
}

export function friendlyNetworkMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  const raw = String((error as any)?.message || error || '').trim();
  if (!navigator.onLine || /failed to fetch|networkerror|network request failed|load failed|offline/i.test(raw)) {
    return 'Your internet connection is weak or you are not connected. Please check your internet and reconnect.';
  }
  if (/timeout|timed out|504|502|503/i.test(raw)) return 'The server is taking too long to respond. Please try again.';
  if (/401|403|unauthor/i.test(raw)) return 'Your session has expired. Please log in again.';
  return raw || fallback;
}

export function reportAppError(error: unknown, fallback?: string) {
  const message = friendlyNetworkMessage(error, fallback);
  try { window.dispatchEvent(new CustomEvent('pardais:app-error', { detail: { message } })); } catch {}
  return message;
}

async function request(path: string, init: RequestInit = {}) {
  try {
    const h = await headers(Boolean(init.body));
    const response = await fetch(`${API_BASE}${path}`, { ...init, headers: { ...h, ...(init.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(String(data?.error || `${init.method || 'GET'} ${path} failed (${response.status})`));
      reportAppError(error);
      throw error;
    }
    return { data };
  } catch (error) {
    reportAppError(error);
    throw error;
  }
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body?: unknown) => request(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: (path: string, body?: unknown) => request(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: (path: string, body?: unknown) => request(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: (path: string) => request(path, { method: 'DELETE' }),
};

export { API_BASE };

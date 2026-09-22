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
  // A real browser/network failure is different from a reachable API returning 5xx.
  // Do not tell the user their internet is weak when the backend itself is failing.
  if (!navigator.onLine || /failed to fetch|networkerror|network request failed|load failed|offline/i.test(raw)) {
    return 'Your internet connection is weak or you are not connected. Please check your internet and reconnect.';
  }
  if (/(500|internal server error)/i.test(raw)) return 'Server error. Your internet is connected, but the server is not responding correctly. Please try again.';
  if (/(502|503|504)|timeout|timed out/i.test(raw)) return 'Server is temporarily unavailable. Please try again in a moment.';
  if (/401|403|unauthor/i.test(raw)) return 'Your session has expired. Please log in again.';
  return raw || fallback;
}

export function reportAppError(error: unknown, fallback?: string) {
  const message = friendlyNetworkMessage(error, fallback);
  try { window.dispatchEvent(new CustomEvent('pardais:app-error', { detail: { message } })); } catch {}
  return message;
}

async function request(path: string, init: RequestInit = {}) {
  const method = String(init.method || 'GET').toUpperCase();
  const maxAttempts = method === 'GET' ? 2 : 1;
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const h = await headers(Boolean(init.body));
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15000);
      let response: Response;
      try {
        response = await fetch(`${API_BASE}${path}`, { ...init, signal: controller.signal, headers: { ...h, ...(init.headers || {}) } });
      } finally {
        window.clearTimeout(timeout);
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = String(data?.error || `${method} ${path} failed (${response.status})`);
        const error = new Error(detail);
        reportAppError(error);
        throw error;
      }
      return { data };
    } catch (error) {
      lastError = error;
      const raw = String((error as any)?.message || error || '');
      const networkFailure = !navigator.onLine || /failed to fetch|networkerror|network request failed|load failed|abort|timeout/i.test(raw);
      if (!(method === 'GET' && attempt < maxAttempts && networkFailure)) break;
      await new Promise(r => window.setTimeout(r, 600));
    }
  }
  reportAppError(lastError);
  throw lastError;
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body?: unknown) => request(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: (path: string, body?: unknown) => request(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: (path: string, body?: unknown) => request(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: (path: string) => request(path, { method: 'DELETE' }),
};

export { API_BASE };

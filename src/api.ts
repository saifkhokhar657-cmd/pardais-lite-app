import { auth } from './firebase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.pardaislite.soulverseapps.com';

async function headers(contentType = false) {
  const h: Record<string, string> = { Accept: 'application/json' };
  if (contentType) h['Content-Type'] = 'application/json';
  const user = auth.currentUser;
  if (user) h.Authorization = `Bearer ${await user.getIdToken()}`;
  return h;
}

async function request(path: string, init: RequestInit = {}) {
  const h = await headers(Boolean(init.body));
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers: { ...h, ...(init.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(data?.error || `${init.method || 'GET'} ${path} failed (${response.status})`));
  return { data };
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body?: unknown) => request(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: (path: string, body?: unknown) => request(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: (path: string) => request(path, { method: 'DELETE' }),
};

export { API_BASE };

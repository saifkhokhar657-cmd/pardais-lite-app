const DB_NAME = 'pardais-lite-media-cache';
const STORE = 'reels';
const MAX_REELS = 5;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Cache database unavailable'));
  });
}

export async function putCachedReel(id: string, url: string, blob: Blob) {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ id, url, blob, cachedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    await trimCache();
  } catch {}
}

async function trimCache() {
  try {
    const db = await openDb();
    const rows = await new Promise<any[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    if (rows.length > MAX_REELS) {
      rows.sort((a,b) => Number(b.cachedAt||0)-Number(a.cachedAt||0));
      const tx = db.transaction(STORE, 'readwrite');
      rows.slice(MAX_REELS).forEach(r => tx.objectStore(STORE).delete(r.id));
      await new Promise<void>(resolve => { tx.oncomplete = () => resolve(); tx.onerror = () => resolve(); });
    }
    db.close();
  } catch {}
}

export async function getCachedReel(id: string): Promise<{ url: string; blob: Blob } | null> {
  try {
    const db = await openDb();
    const row = await new Promise<any>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (!row?.blob) return null;
    return { url: row.url, blob: row.blob };
  } catch { return null; }
}

export async function getCachedReels(ids: string[]) {
  const out: Record<string, string> = {};
  for (const id of ids.slice(0, MAX_REELS)) {
    const row = await getCachedReel(id);
    if (row) out[id] = URL.createObjectURL(row.blob);
  }
  return out;
}

export async function cacheReel(id: string, url: string) {
  if (!id || !url) return;
  try {
    const existing = await getCachedReel(id);
    if (existing?.url === url) return;
    const response = await fetch(url, { mode: 'cors', cache: 'no-store' });
    if (!response.ok) throw new Error(`Media request failed (${response.status})`);
    const blob = await response.blob();
    await putCachedReel(id, url, blob);
  } catch {}
}

export function saveFeedMetadata(mode: string, items: any[]) {
  try {
    localStorage.setItem(`pardais-feed-${mode}`, JSON.stringify(items.slice(0, MAX_REELS)));
  } catch {}
}

export function loadFeedMetadata(mode: string): any[] {
  try {
    const raw = localStorage.getItem(`pardais-feed-${mode}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

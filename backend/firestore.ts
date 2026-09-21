import { db } from './firebase-admin.js';
import type { DocumentData, Query } from 'firebase-admin/firestore';

export const now = () => new Date().toISOString();

export async function add(collection: string, data: Record<string, unknown>, id?: string) {
  const ref = id ? db.collection(collection).doc(id) : db.collection(collection).doc();
  await ref.set({ ...data, createdAt: data.createdAt ?? now(), updatedAt: data.updatedAt ?? now() }, { merge: true });
  return ref.id;
}

export async function get(collection: string, id: string): Promise<any | null> {
  const snap = await db.collection(collection).doc(id).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

export async function update(collection: string, id: string, data: Record<string, unknown>) {
  await db.collection(collection).doc(id).set({ ...data, updatedAt: now() }, { merge: true });
  return get(collection, id);
}

export async function remove(collection: string, id: string) {
  await db.collection(collection).doc(id).delete();
}

export async function list(collection: string, filters: Record<string, unknown> = {}, limit = 100): Promise<Array<any>> {
  let q: Query<DocumentData> = db.collection(collection);
  for (const [field, value] of Object.entries(filters)) q = q.where(field, '==', value);
  const snap = await q.limit(limit).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function upsertUser(uid: string, data: Record<string, unknown>) {
  const ref = db.collection('users').doc(uid);
  const existing = await ref.get();
  const base = {
    uid,
    email: data.email ?? null,
    name: data.name ?? 'Pardais User',
    avatar: data.avatar ?? null,
    level: existing.exists ? (existing.data()?.level ?? 1) : 1,
    status: 'active',
    updatedAt: now(),
    ...(existing.exists ? {} : { createdAt: now(), coins: 0 }),
  };
  await ref.set(base, { merge: true });
  const profileRef = db.collection('profiles').doc(uid);
  const profile = await profileRef.get();
  if (!profile.exists) await profileRef.set({ userId: uid, firstName: data.name ?? 'Pardais', lastName: '', bio: '', username: data.username ?? null, avatar: data.avatar ?? null, createdAt: now(), updatedAt: now() });
  return get('users', uid);
}

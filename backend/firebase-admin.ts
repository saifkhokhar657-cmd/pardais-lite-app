import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldPath, Timestamp } from 'firebase-admin/firestore';

function serviceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64?.trim();
  if (raw) return JSON.parse(raw);
  if (b64) return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_BASE64 is required');
}

const app = getApps()[0] ?? initializeApp({
  credential: cert(serviceAccount()),
  projectId: process.env.FIREBASE_PROJECT_ID || 'pardais-lite-production',
});

export const adminAuth = getAuth(app);
export const db = getFirestore(app);
export { FieldPath, Timestamp };

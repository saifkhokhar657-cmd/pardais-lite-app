import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldPath, Timestamp } from 'firebase-admin/firestore';

function credentialConfig() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64?.trim();
  if (raw) return { credential: cert(JSON.parse(raw)) };
  if (b64) return { credential: cert(JSON.parse(Buffer.from(b64, 'base64').toString('utf8'))) };
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return { credential: applicationDefault() };
  return {};
}

const projectId = process.env.FIREBASE_PROJECT_ID || 'pardais-lite-production';
const app = getApps()[0] ?? initializeApp({
  ...credentialConfig(),
  projectId,
});

export const firebaseCredentialsConfigured = Boolean(
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ||
  process.env.FIREBASE_SERVICE_ACCOUNT_BASE64?.trim() ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS
);

export const adminAuth = getAuth(app);
export const db = getFirestore(app);
export { FieldPath, Timestamp };

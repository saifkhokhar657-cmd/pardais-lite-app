import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldPath, Timestamp } from 'firebase-admin/firestore';

function parseServiceAccount(raw: string) {
  const parsed = JSON.parse(raw);
  if (parsed.private_key) parsed.private_key = String(parsed.private_key).replace(/\\n/g, '\n');
  return parsed;
}

function credentialConfig() {
  // Support the Railway variable names used by older deployments as well as
  // the current JSON/base64 variables. This prevents a redeploy from silently
  // losing Firestore access when the credential is stored as separate fields.
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_ADMIN_JSON || '').trim();
  const b64 = (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || process.env.FIREBASE_SERVICE_ACCOUNT_BASE64_JSON || '').trim();
  if (raw) return { credential: cert(parseServiceAccount(raw)) };
  if (b64) return { credential: cert(parseServiceAccount(Buffer.from(b64, 'base64').toString('utf8'))) };
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  if (clientEmail && privateKey) return { credential: cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') }) };
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
  process.env.FIREBASE_SERVICE_ACCOUNT?.trim() ||
  process.env.FIREBASE_ADMIN_JSON?.trim() ||
  process.env.FIREBASE_SERVICE_ACCOUNT_BASE64?.trim() ||
  process.env.FIREBASE_SERVICE_ACCOUNT_BASE64_JSON?.trim() ||
  (process.env.FIREBASE_CLIENT_EMAIL?.trim() && process.env.FIREBASE_PRIVATE_KEY?.trim()) ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS
);

export const adminAuth = getAuth(app);
export const db = getFirestore(app);
export { FieldPath, Timestamp };

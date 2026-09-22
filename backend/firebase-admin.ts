import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldPath, Timestamp } from 'firebase-admin/firestore';

function parseServiceAccount(raw: string) {
  const parsed = JSON.parse(raw);
  if (parsed.private_key) parsed.private_key = String(parsed.private_key).replace(/\\n/g, '\n');
  return parsed;
}

function rawServiceAccount() {
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_ADMIN_JSON || '').trim();
  if (raw) return parseServiceAccount(raw);
  const b64 = (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || process.env.FIREBASE_SERVICE_ACCOUNT_BASE64_JSON || '').trim();
  if (b64) return parseServiceAccount(Buffer.from(b64, 'base64').toString('utf8'));
  return null;
}

// Prefer the project_id embedded in the service-account itself. This prevents
// a stale/mismatched FIREBASE_PROJECT_ID Railway variable from sending the
// Admin SDK to a different Firebase project after a redeploy.
const serviceAccount = rawServiceAccount();
export const firebaseProjectId = serviceAccount?.project_id?.trim() || process.env.FIREBASE_PROJECT_ID?.trim() || 'pardais-lite-production';

function credentialConfig() {
  // Support the Railway variable names used by older deployments as well as
  // the current JSON/base64 variables.
  if (serviceAccount) return { credential: cert(serviceAccount) };
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  if (clientEmail && privateKey) return { credential: cert({ projectId: firebaseProjectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') }) };
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return { credential: applicationDefault() };
  return {};
}

const app = getApps()[0] ?? initializeApp({
  ...credentialConfig(),
  projectId: firebaseProjectId,
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

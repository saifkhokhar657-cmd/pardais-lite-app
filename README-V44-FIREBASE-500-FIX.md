# V44 — Firebase/Firestore 500 regression fix

The V40→V43 frontend changes were not the source of the backend 500. The API was returning a generic 500 whenever Firestore failed. V44 hardens the Firebase Admin credential resolver and exposes a safe diagnostic.

## Supported Railway credential forms
- FIREBASE_SERVICE_ACCOUNT_JSON
- FIREBASE_SERVICE_ACCOUNT_BASE64
- FIREBASE_SERVICE_ACCOUNT / FIREBASE_ADMIN_JSON (legacy JSON names)
- FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
- GOOGLE_APPLICATION_CREDENTIALS

Private key values with literal `\n` are normalized to real newlines.

The API now maps common Firestore credential/permission/availability failures to actionable messages instead of a generic 500.

After deployment, open `/api/health`. It must report `firebase: ready`. If it reports `missing-service-account` or `database-error`, the Railway Firebase variables/database connection still need correction.

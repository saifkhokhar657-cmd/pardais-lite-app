# V45 — Firestore regression hardening

## What was traced
The V40→V43 source history does not show a frontend change that could make both Live and Profile fail at the same time. Both routes call the same Firestore Admin backend. The observed generic 500 therefore points to a backend Firestore/runtime failure rather than a Live-only UI bug.

## V45 changes
- Service-account `project_id` is preferred over a stale `FIREBASE_PROJECT_ID` Railway variable when a JSON/base64 service account is present.
- Existing Railway credential variable names remain supported.
- `/api/health` reports a safe Firestore error code so the runtime failure can be identified without exposing secrets.
- Adds a clearer message for a missing Firebase project/Firestore database.

## Verification
After deploying, open `/api/health`.
- `firebase: ready` = backend Firestore access is working.
- `firebase: missing-service-account` = Railway credential variable is missing.
- `firebase: database-error` + `code` = Firestore runtime/project/permission problem; use that code to fix the Railway/Firebase configuration.

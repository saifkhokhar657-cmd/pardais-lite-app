# V43 — API/server error handling fix

This version fixes a misleading V42 behavior where any API 500 could be surfaced as a connection problem.

## Frontend
- Distinguishes browser/network failures from API 500/502/503/504 failures.
- GET requests retry once on transient network failures.
- API requests have a 15-second timeout so screens do not hang indefinitely.
- Server errors now say the internet is connected and the server is failing.

## Backend
- `/api/health` now checks Firebase server credentials and performs a lightweight Firestore read.
- Missing Firebase service-account configuration returns a clear 503 diagnostic instead of an opaque 500 on data routes.
- Firestore/database failures are logged by the API server.

## Important deployment requirement
The Railway/API environment must contain one of:
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `FIREBASE_SERVICE_ACCOUNT_BASE64`
- `GOOGLE_APPLICATION_CREDENTIALS`

If `/api/health` reports `missing-service-account` or `database-error`, fix the Railway environment variables/database connection. A frontend ZIP alone cannot supply a private Firebase service-account secret.

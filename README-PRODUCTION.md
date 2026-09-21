# Pardais Lite — Production Build

This package is migrated off AppDeploy. The runtime is a normal Node/Express API suitable for Railway and a Vite React web client.

## Production services

- Firebase Authentication: email/password + Google
- Firebase Firestore: users, profiles, follows, live rooms, members, wallets, gifts, comments, notifications, messages, moderation and actions
- Agora RTC: real-time audio/video live streaming with server-issued RTC tokens
- Cloudflare R2: private media storage using backend-generated presigned upload URLs
- Railway: Node/Express API and optional static frontend serving

## Required Railway variables

Set these in Railway; never commit them:

- `PORT` — Railway supplies this automatically; `8080` is fine as a local fallback.
- `CORS_ORIGINS=https://pardaislite.soulverseapps.com`
- `FIREBASE_PROJECT_ID=pardais-lite-production`
- `FIREBASE_SERVICE_ACCOUNT_JSON` **or** `FIREBASE_SERVICE_ACCOUNT_BASE64`
- `AGORA_APP_ID`
- `AGORA_APP_CERTIFICATE`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME=pardais-lite-media`
- `R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
- `R2_PUBLIC_BASE_URL=https://media.pardaislite.soulverseapps.com`

Frontend build variables:

- `VITE_API_BASE_URL` — optional for local/dev; production uses the same-origin `/api` endpoint automatically.
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN=pardais-lite-production.firebaseapp.com`
- `VITE_FIREBASE_PROJECT_ID=pardais-lite-production`
- `VITE_FIREBASE_STORAGE_BUCKET=pardais-lite-production.firebasestorage.app`
- `VITE_FIREBASE_MESSAGING_SENDER_ID=233413127932`
- `VITE_FIREBASE_APP_ID=1:233413127932:web:d6802f84a3545de873179`
- `VITE_FIREBASE_MEASUREMENT_ID=G-ZSW29BYVR`

## Firebase service account

Create a Firebase service account with access to the Pardais Lite production project and place the complete JSON in `FIREBASE_SERVICE_ACCOUNT_JSON` as a single environment variable. Do not put the JSON in GitHub.

## Agora flow

1. Authenticated Firebase user signs in.
2. Backend verifies the Firebase ID token.
3. `/api/live/create` creates a Firestore live room and returns an Agora RTC token.
4. The host publishes microphone audio and can enable the camera.
5. A viewer joins `/api/live/join`; the backend returns a viewer token.
6. The browser subscribes to the host's real-time audio/video through Agora.
7. Closing the host stream marks the room ended; viewers leave their membership.

## R2 flow

The browser does not receive the R2 secret. The backend creates a short-lived presigned upload URL from `/api/media/presign`. Upload directly to R2 with the returned URL.

## Important

Do not paste Firebase service-account JSON, Agora App Certificate, R2 Secret Access Key, or any other production secret into source files, screenshots, GitHub, or chat.


## Legacy AppDeploy cleanup
The production server is `server.ts`. The old AppDeploy backend files are no longer used. CI removes legacy `backend/index.ts`, `backend/pardais.ts`, `backend/realtime-subscribers.ts`, and `backend/realtime.ts` before compilation so stale files in an existing repository cannot break the production build.

## Railway / Agora runtime fix
The Agora token package is CommonJS. The server loads it with Node's `createRequire()` so the ESM production server does not attempt a named ESM import from `agora-token`. Agora's Node examples expose `RtcTokenBuilder` and `RtcRole` from the CommonJS module, and `buildTokenWithUid` accepts the token and privilege expiry values used here.


## Railway Firebase Admin credential (required for Firestore/Auth API)

The Railway container must have a Firebase Admin service-account credential at runtime. The server no longer crashes at boot when it is missing, but authenticated Firestore/Auth requests require it. Firebase recommends keeping service-account credentials in a secure server environment rather than source control.

Set **one** of these Railway service variables:

- `FIREBASE_SERVICE_ACCOUNT_BASE64` — recommended for Railway. Base64-encode the complete Firebase service-account JSON and paste the resulting single line.
- `FIREBASE_SERVICE_ACCOUNT_JSON` — the complete JSON as one Railway variable.
- `GOOGLE_APPLICATION_CREDENTIALS` — only when the service-account JSON is mounted at that path.

Also set:
- `FIREBASE_PROJECT_ID=pardais-lite-production`

After adding/updating variables, deploy the staged changes. Railway variables are injected into the running service as environment variables.

## Firebase Web config
The browser Firebase SDK reads the public Firebase Web config from `/firebase-config.js` at request time when the app is served by Railway. This avoids the Vite build-time environment-variable issue. The same `VITE_FIREBASE_*` variables can still be supplied for local Vite builds. No Firebase service-account secret is exposed to the browser.


## V12 startup fix
The web bootstrap now renders the Pardais Lite splash before loading the React app. If a JavaScript module (including Firebase config) fails during startup, the splash remains visible and shows a refresh/error message instead of a blank dark screen.

### Railway Firebase configuration
Firebase Web variables are intentionally loaded at runtime from `/firebase-config.js` by the production Express server. The Vite build does not require `VITE_FIREBASE_*` variables, so Docker builds complete even when Railway does not expose service Variables inside Docker `RUN` steps. Make sure the six `VITE_FIREBASE_*` variables are present in the Railway service runtime environment before starting the deployed service.

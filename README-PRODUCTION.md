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

- `VITE_API_BASE_URL=https://api.pardaislite.soulverseapps.com`
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

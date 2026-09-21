# Pardais Lite — Cloudflare deployment note

The AppDeploy-only `@appdeploy/client` dependency was replaced with a standard browser `fetch` API wrapper in `src/lib/api.ts`. This fixes the Cloudflare Pages Vite build error caused by Rollup being unable to resolve `@appdeploy/client`.

## Important
Cloudflare Pages hosts the Vite frontend. The `/api/*` requests in `src/App.tsx` still require a deployed backend/API service. Deploy `backend/` separately (for example as a Cloudflare Worker or another backend service) and keep the frontend and API on the same origin or configure the API base URL/CORS.

Do not install a random npm package named `@appdeploy/client`; it was an AppDeploy environment dependency, not a normal project dependency in this exported package.

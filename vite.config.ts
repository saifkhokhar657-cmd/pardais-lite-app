import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Firebase Web configuration is loaded at runtime from /firebase-config.js.
// Do not require VITE_FIREBASE_* variables during the Vite build: Railway's
// Docker build can build the frontend without exposing runtime Variables to
// Docker RUN steps. The production Express server serves /firebase-config.js
// using the Railway runtime Variables.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: '0.0.0.0' },
});

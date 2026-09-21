import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Generate a real static firebase-config.js during the Vite build.
 * This is important on Railway when the frontend is served as static files:
 * a Node/Express runtime route such as /firebase-config.js may not exist there.
 * Firebase Web config is public client configuration, so it is safe to ship
 * these values in the browser bundle/config file.
 */
function firebaseRuntimeConfig(): Plugin {
  return {
    name: 'pardais-firebase-runtime-config',
    configResolved(config) {
      // Railway injects service Variables into process.env during the build.
      // Vite's loadEnv() reads .env files and does not reliably include the
      // platform process environment, so merge both sources explicitly.
      const env = { ...loadEnv(config.mode, config.root, ''), ...process.env };
      const required = [
        'VITE_FIREBASE_API_KEY',
        'VITE_FIREBASE_AUTH_DOMAIN',
        'VITE_FIREBASE_PROJECT_ID',
        'VITE_FIREBASE_STORAGE_BUCKET',
        'VITE_FIREBASE_MESSAGING_SENDER_ID',
        'VITE_FIREBASE_APP_ID',
      ];
      const missing = required.filter((key) => !String(env[key] || '').trim());
      if (missing.length) {
        throw new Error(
          `Missing Firebase Web variables at BUILD time: ${missing.join(', ')}. ` +
          'Add these VITE_FIREBASE_* variables to the Railway service Variables, then redeploy with a fresh build.'
        );
      }

      const configFile = {
        apiKey: env.VITE_FIREBASE_API_KEY,
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: env.VITE_FIREBASE_APP_ID,
        measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || '',
      };

      const publicDir = path.resolve(config.root, 'public');
      fs.mkdirSync(publicDir, { recursive: true });
      fs.writeFileSync(
        path.join(publicDir, 'firebase-config.js'),
        `window.__PARDAIS_FIREBASE_CONFIG__=${JSON.stringify(configFile)};\n`,
        'utf8'
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), firebaseRuntimeConfig()],
  server: { port: 5173, host: '0.0.0.0' },
});

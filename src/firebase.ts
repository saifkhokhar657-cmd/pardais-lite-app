import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBCmghRRZvulbvqv_aHGvsDQ6SoZf4gKA',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'pardais-lite-production.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'pardais-lite-production',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'pardais-lite-production.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '233413127932',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:233413127932:web:d6802f84a3545de873179',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-ZSW29BYVR',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export { app };

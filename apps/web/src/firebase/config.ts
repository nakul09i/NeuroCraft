import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

/**
 * NeuroCraft Centralized Firebase Client Configuration
 *
 * Implements the official modern modular Firebase Web SDK (v11+).
 * If Firebase environment variables are not supplied or invalid,
 * the client degrades gracefully to local-first offline SQLite mode
 * with zero startup crashes.
 */

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  );
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.info("[NeuroCraft] Firebase initialized successfully. Cloud sync & Auth enabled.");
  } catch (error) {
    console.warn("[NeuroCraft] Firebase initialization failed. Falling back to local offline mode.", error);
    app = null;
    auth = null;
    db = null;
  }
} else {
  // Graceful offline fallback
  // No warning spam; clear informational logging for developers
  if (import.meta.env.DEV) {
    console.info(
      "[NeuroCraft] Firebase credentials not configured. Running in local-first offline SQLite mode."
    );
  }
}

export { app, auth, db };
export default app;

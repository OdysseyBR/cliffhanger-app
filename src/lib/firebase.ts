/**
 * Inicialização do Firebase (mesmo projeto da Cliffhanger Store — conta única).
 * A configuração é pública por definição (web config do Firebase), lida de
 * variáveis EXPO_PUBLIC_* no .env (gitignorado; .env.example documenta as chaves).
 */
import { getApps, initializeApp, type FirebaseApp } from "firebase/app";

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

/** false quando o .env não está preenchido — as telas mostram estado de erro. */
export const firebaseEnabled = Boolean(config.apiKey && config.projectId);

let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseEnabled) return null;
  if (getApps().length > 0) return getApps()[0]!;
  app = initializeApp(config);
  return app;
}

/** URL base da loja (API pública /api/*). */
export const STORE_URL = (process.env.EXPO_PUBLIC_STORE_URL ?? "").replace(/\/+$/, "");

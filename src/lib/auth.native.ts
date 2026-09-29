/**
 * Auth — variante NATIVA (Metro prefere `*.native.ts` em iOS/Android).
 *
 * Persiste a sessão com AsyncStorage: sem isso o firebase cai na persistência
 * em memória no React Native e o usuário seria deslogado a cada reinício do
 * app (aviso oficial do próprio firebase@12).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth";
import { getFirebaseApp } from "./firebase";

const app = getFirebaseApp();

function createAuth(): Auth | null {
  if (!app) return null;
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // já inicializado (hot reload) — reaproveita a instância
    return getAuth(app);
  }
}

export const auth: Auth | null = createAuth();

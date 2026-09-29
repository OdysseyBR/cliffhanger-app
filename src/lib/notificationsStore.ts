/**
 * Notificações — persistência compartilhada (Doc Mestre §10/§12.3):
 * - histórico local por usuário (AsyncStorage, melhor esforço);
 * - token push em users/{uid}.pushTokens no Firestore (arrayUnion/arrayRemove,
 *   dedupe automático por dispositivo) — mesmos cuidados do wishlist.ts.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { arrayRemove, arrayUnion, doc, getFirestore, setDoc } from "firebase/firestore";

import { getFirebaseApp } from "./firebase";

/** Estado da permissão de notificação (native) — web sempre "unsupported". */
export type PushPermission = "granted" | "denied" | "undetermined" | "unsupported";

/** Resultado de uma ação de notificação, com mensagem em pt-BR. */
export interface PushActionResult {
  ok: boolean;
  message: string;
}

/** Notificação tocada/recebida, normalizada para a UI e ao roteamento. */
export interface NotificationTap {
  /** identificador nativo da notificação (dedupe no histórico) */
  id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

/** Item do histórico de notificações recebidas neste dispositivo. */
export interface NotificationItem {
  /** identificador nativo da notificação (dedupe) */
  id: string;
  title: string;
  body: string;
  /** rota interna do app ao tocar ("/orders", "/notifications", …) */
  route?: string;
  /** ISO */
  receivedAt: string;
  read: boolean;
}

const HISTORY_LIMIT = 50;
const TOKEN_KEY = "cliffhanger:push-token";

function historyKey(uid: string): string {
  return `cliffhanger:notifications:${uid}`;
}

function isItem(value: unknown): value is NotificationItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.title === "string";
}

/** Lê o histórico local do usuário ([] quando ausente/corrompido). */
export async function loadHistory(uid: string): Promise<NotificationItem[]> {
  try {
    const raw = await AsyncStorage.getItem(historyKey(uid));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isItem) : [];
  } catch {
    return [];
  }
}

/** Anexa ao topo (dedupe por id, limite de 50) — melhor esforço. */
export async function appendHistory(uid: string, item: NotificationItem): Promise<void> {
  try {
    const current = await loadHistory(uid);
    if (current.some((n) => n.id === item.id)) return;
    const next = [item, ...current].slice(0, HISTORY_LIMIT);
    await AsyncStorage.setItem(historyKey(uid), JSON.stringify(next));
  } catch {
    /* storage indisponível — segue sem gravar */
  }
}

/** Marca um item como lido — melhor esforço. */
export async function markRead(uid: string, id: string): Promise<void> {
  try {
    const current = await loadHistory(uid);
    const next = current.map((n) => (n.id === id ? { ...n, read: true } : n));
    await AsyncStorage.setItem(historyKey(uid), JSON.stringify(next));
  } catch {
    /* melhor esforço */
  }
}

/** Limpa o histórico do usuário — melhor esforço. */
export async function clearHistory(uid: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(historyKey(uid));
  } catch {
    /* melhor esforço */
  }
}

/**
 * Registra o token do dispositivo em users/{uid}.pushTokens (arrayUnion) —
 * falha em silêncio (offline/regras): o app segue funcional sem push.
 */
export async function savePushToken(uid: string, token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* sem cópia local — o logout não conseguirá remover este token */
  }
  const app = getFirebaseApp();
  if (!app) return;
  try {
    await setDoc(
      doc(getFirestore(app), "users", uid),
      {
        pushTokens: arrayUnion(token),
        pushEnabled: true,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  } catch {
    /* offline/permissão — o registro remoto fica para a próxima tentativa */
  }
}

/** Remove o token deste dispositivo de users/{uid} (logout) — melhor esforço. */
export async function removePushToken(uid: string): Promise<void> {
  let token: string | null = null;
  try {
    token = await AsyncStorage.getItem(TOKEN_KEY);
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    /* sem cópia local — não há como identificar o token deste dispositivo */
  }
  if (!token) return;
  const app = getFirebaseApp();
  if (!app) return;
  try {
    await setDoc(
      doc(getFirestore(app), "users", uid),
      {
        pushTokens: arrayRemove(token),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  } catch {
    /* melhor esforço */
  }
}

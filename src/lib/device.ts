/**
 * Dispositivo e sessões do app (Etapa C) — espelha o `device.ts` do site:
 * `sid` estável por instalação (`cliffhanger:sid`), registro no backend com
 * throttle de 5 min (`cliffhanger:sid-at`) e rótulo amigável. O registry
 * mora em `users/{uid}/sessions/{sid}` (escrita só via Admin SDK).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import * as api from "./api";
import type { AccountSession } from "./api";

export type { AccountSession };

const SID_KEY = "cliffhanger:sid";
const SID_AT_KEY = "cliffhanger:sid-at";
const THROTTLE_MS = 5 * 60_000;

/** Rótulo do dispositivo: o app identifica pelo sistema operacional. */
export function deviceLabel(): string {
  return `Aplicativo Cliffhanger (${Platform.OS})`;
}

/** Id estável desta instalação (gerado uma vez e persistido). */
export async function getSid(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(SID_KEY);
    if (existing) return existing;
    const generated = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    await AsyncStorage.setItem(SID_KEY, generated);
    return generated;
  } catch {
    // storage indisponível — sid volátil desta execução
    return "ephemeral";
  }
}

/** Zera o throttle (logout/exclusão) para o próximo login registrar já. */
export async function resetSessionClock(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SID_AT_KEY);
  } catch {
    /* melhor esforço */
  }
}

/**
 * Registra/atualiza a sessão no backend — throttled no cliente (5 min).
 * Melhor esforço: falha silenciosa (API 503/offline não pode quebrar login).
 */
export async function registerSession(token: string): Promise<void> {
  try {
    const sid = await getSid();
    const last = Number((await AsyncStorage.getItem(SID_AT_KEY)) ?? "0");
    if (Number.isFinite(last) && Date.now() - last < THROTTLE_MS) return;
    await api.registerSession(token, { sid, device: deviceLabel() });
    await AsyncStorage.setItem(SID_AT_KEY, String(Date.now()));
  } catch {
    /* offline — tenta na próxima visita */
  }
}

/** Lista as sessões do usuário (null quando a API falha/503). */
export async function loadSessions(token: string): Promise<AccountSession[] | null> {
  try {
    const data = await api.loadSessions(token);
    return Array.isArray(data.sessions) ? data.sessions : [];
  } catch {
    return null;
  }
}

/** Sai apenas deste dispositivo (apaga o registro no logout). */
export async function leaveSession(token: string): Promise<void> {
  try {
    const sid = await getSid();
    if (!sid || sid === "ephemeral") return;
    await api.leaveSession(token, sid);
    await resetSessionClock();
  } catch {
    /* melhor esforço — o registro envelhece sozinho */
  }
}

/** Revoga tudo (refresh tokens + registry) e zera o throttle. */
export async function revokeSessions(token: string): Promise<void> {
  await api.revokeAllSessions(token);
  await resetSessionClock();
}

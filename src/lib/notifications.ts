/**
 * Notificações — variante WEB (Metro prefere `*.native.ts` em iOS/Android,
 * então este arquivo só entra no bundle do navegador).
 *
 * Push remoto e notificações locais são recursos de aplicativo (§10 do Doc
 * Mestre): aqui a API responde "unsupported" e a UI explica com elegância.
 * Persistência compartilhada (histórico/token) vive em notificationsStore.ts.
 */
import type {
  NotificationTap,
  PushActionResult,
  PushPermission,
} from "./notificationsStore";

/** Plataforma sem suporte a notificações. */
export function isNotificationsSupported(): boolean {
  return false;
}

export async function getPushPermission(): Promise<PushPermission> {
  return "unsupported";
}

export async function requestPushPermission(): Promise<PushPermission> {
  return "unsupported";
}

/** Sem push no navegador — mensagem explicando onde ativar. */
export async function registerPush(_uid: string): Promise<PushActionResult> {
  return {
    ok: false,
    message: "Push remoto é recurso do aplicativo — ative as notificações pelo Android/iOS.",
  };
}

/** Notificação de teste local — indisponível no navegador. */
export async function sendTestNotification(): Promise<PushActionResult> {
  return {
    ok: false,
    message: "O teste local acontece no aplicativo (Android/iOS), não no navegador.",
  };
}

/**
 * Escuta de notificações recebidas em 1º plano — no web nunca chegam.
 * Retorna uma assinatura vazia para o unsubscribe uniforme do bridge.
 */
export function addReceiveListener(
  _onReceive: (notification: NotificationTap) => void,
): { remove: () => void } {
  return { remove: () => void 0 };
}

/** Último toque em notificação — sempre null no navegador. */
export function useNotificationTap(): NotificationTap | null {
  return null;
}

/**
 * Notificações — variante NATIVA (Metro prefere `*.native.ts` em iOS/Android).
 *
 * Push remoto via Expo Push Service + notificações locais (Doc Mestre
 * §10/§12.3). Particularidades do SDK 57:
 * - sem `setNotificationHandler`, nada é apresentado em 1º plano;
 * - o Expo Go (SDK 53+) não entrega push — `registerPush` degrada com
 *   mensagem clara; as notificações LOCAIS continuam funcionando no Expo Go
 *   (por isso o botão "Enviar notificação de teste" é sempre útil);
 * - o token remoto depende de `extra.eas.projectId` (fase EAS do projeto).
 */
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import {
  savePushToken,
  type NotificationTap,
  type PushActionResult,
  type PushPermission,
} from "./notificationsStore";

/** Canal "default" (padrão do exemplo oficial) — push e local o utilizam. */
const CHANNEL_ID = "default";

// Banner + som em 1º plano (SDK 57: sem handler, a notificação é descartada).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function mapStatus(status: string): PushPermission {
  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  return "undetermined";
}

/** Cria (idempotente) o canal de notificação no Android, antes do pedido. */
async function ensureChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Cliffhanger Store",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#E7CB9B",
    });
  } catch {
    /* canal padrão do sistema segue valendo */
  }
}

/** Plataforma com suporte a notificações (Android/iOS). */
export function isNotificationsSupported(): boolean {
  return true;
}

export async function getPushPermission(): Promise<PushPermission> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return mapStatus(status);
  } catch {
    return "undetermined";
  }
}

export async function requestPushPermission(): Promise<PushPermission> {
  await ensureChannel();
  try {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    return mapStatus(status);
  } catch {
    return "undetermined";
  }
}

/**
 * Registra o token do dispositivo em users/{uid}.pushTokens. Degrada com
 * mensagens honestas: sem permissão, sem projeto EAS ou em ambiente sem
 * push (Expo Go). A permissão concedida já é um passo real do usuário.
 */
export async function registerPush(uid: string): Promise<PushActionResult> {
  await ensureChannel();
  const permission = await getPushPermission();
  if (permission !== "granted") {
    return { ok: false, message: "Permissão de notificações não concedida." };
  }
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    return {
      ok: false,
      message:
        "Permissão concedida! O push remoto entra em vigor quando o projeto estiver ligado à EAS.",
    };
  }
  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await savePushToken(uid, token);
    return { ok: true, message: "Dispositivo registrado para receber avisos." };
  } catch {
    // Esperado no Expo Go (SDK 53+ não entrega push) ou sem rede.
    return {
      ok: false,
      message:
        "Permissão concedida — o push remoto não roda no Expo Go; num build de desenvolvimento este dispositivo fica registrado.",
    };
  }
}

/** Envia uma notificação LOCAL imediata (testa canal + banner de verdade). */
export async function sendTestNotification(): Promise<PushActionResult> {
  await ensureChannel();
  const permission = await getPushPermission();
  if (permission !== "granted") {
    return { ok: false, message: "Ative as notificações para fazer o teste." };
  }
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Cliffhanger Store",
        body: "Notificação de teste — se você está vendo isso, está tudo certo.",
        data: { route: "/notifications" },
        sound: true,
      },
      trigger: null, // imediata
    });
    return { ok: true, message: "Teste enviado — o banner deve aparecer agora." };
  } catch {
    return { ok: false, message: "Não foi possível enviar a notificação de teste." };
  }
}

/** Escuta notificações recebidas em 1º plano → histórico do usuário. */
export function addReceiveListener(
  onReceive: (notification: NotificationTap) => void,
): { remove: () => void } {
  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    const { request } = notification;
    const content = request.content;
    onReceive({
      id: request.identifier,
      title: content.title ?? "Notificação",
      body: content.body ?? "",
      data: (content.data ?? {}) as Record<string, unknown>,
    });
  });
  return { remove: () => subscription.remove() };
}

/**
 * Último toque do usuário (inclusive ao abrir o app frio — o hook cobre o
 * cold start, recomendado pela documentação oficial).
 */
export function useNotificationTap(): NotificationTap | null {
  const response = Notifications.useLastNotificationResponse();
  if (!response) return null;
  const { request } = response.notification;
  const content = request.content;
  return {
    id: request.identifier,
    title: content.title ?? "Notificação",
    body: content.body ?? "",
    data: (content.data ?? {}) as Record<string, unknown>,
  };
}

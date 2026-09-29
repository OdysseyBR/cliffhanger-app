/**
 * Notificações (Doc Mestre §10/§12.3) — ativação da permissão push, teste
 * local de notificação e histórico das notificações recebidas neste
 * dispositivo. No navegador, o stub em notifications.ts explica que o
 * recurso pertence ao aplicativo Android/iOS.
 */
import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Loading, Screen } from "@/components/Screen";
import { Colors, Fonts, Radius, ScreenPadding } from "@/constants/theme";
import { formatDate } from "@/lib/catalog";
import {
  getPushPermission,
  isNotificationsSupported,
  registerPush,
  requestPushPermission,
  sendTestNotification,
} from "@/lib/notifications";
import {
  clearHistory,
  loadHistory,
  markRead,
  type NotificationItem,
  type PushPermission,
} from "@/lib/notificationsStore";
import { useAuth } from "@/lib/useAuth";

interface Notice {
  ok: boolean;
  text: string;
}

/** Tom do cartão de status. */
const STATUS_TONE = {
  granted: { icon: "checkmark-circle", color: Colors.accent },
  denied: { icon: "alert-circle-outline", color: Colors.warning },
  undetermined: { icon: "notifications-outline", color: Colors.accent },
  unsupported: { icon: "phone-portrait-outline", color: Colors.textMuted },
} as const;

const STATUS_COPY: Record<PushPermission, { title: string; message: string }> = {
  granted: {
    title: "Notificações ativadas",
    message: "Pronto! Os avisos chegam no app e no centro de notificações do celular.",
  },
  denied: {
    title: "Permissão negada",
    message: "Libere as notificações nas configurações do sistema para receber os avisos da loja.",
  },
  undetermined: {
    title: "Receba avisos em tempo real",
    message:
      "Ative para saber na hora de pedidos enviados, lançamentos, promoções e novidades das suas obras.",
  },
  unsupported: {
    title: "Notificações no aplicativo",
    message:
      "No navegador elas ficam de fora — abra o app Cliffhanger (Android/iOS) e ative por lá.",
  },
};

/** Promessas do §12.3 — o que a loja pode avisar. */
const PROMISES: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: "cube-outline", label: "Pedidos enviados e entregues" },
  { icon: "rocket-outline", label: "Novos lançamentos e pré-vendas" },
  { icon: "pricetag-outline", label: "Promoções e cupons ativos" },
  { icon: "book-outline", label: "Novidades das suas obras favoritas" },
];

export default function NotificationsScreen() {
  const { user, loading: authLoading } = useAuth();
  const supported = isNotificationsSupported();

  const [permission, setPermission] = useState<PushPermission | null>(null);
  const [history, setHistory] = useState<NotificationItem[] | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const started = useRef(false);

  const refreshHistory = useCallback(async () => {
    if (!user) {
      setHistory(null);
      return;
    }
    setHistory(await loadHistory(user.uid));
  }, [user]);

  useEffect(() => {
    void getPushPermission().then(setPermission);
  }, []);

  useEffect(() => {
    if (user && !started.current) {
      started.current = true;
      void refreshHistory();
    }
  }, [user, refreshHistory]);

  const onRefresh = async () => {
    setRefreshing(true);
    setPermission(await getPushPermission());
    await refreshHistory();
    setRefreshing(false);
  };

  /** Ativa: pede a permissão e, se concedida, registra o token push. */
  const enable = async () => {
    setBusy(true);
    const next = await requestPushPermission();
    setPermission(next);
    if (next !== "granted") {
      setNotice({
        ok: false,
        text:
          next === "denied"
            ? "Permissão negada — libere as notificações nas configurações do sistema."
            : "Permissão não concedida.",
      });
      setBusy(false);
      return;
    }
    if (user) {
      const result = await registerPush(user.uid);
      setNotice({ ok: result.ok, text: result.message });
    }
    setBusy(false);
  };

  /** Notificação local imediata — o bridge grava no histórico em 1º plano. */
  const runTest = async () => {
    setBusy(true);
    const result = await sendTestNotification();
    setNotice({ ok: result.ok, text: result.message });
    setBusy(false);
    if (result.ok) {
      // a entrega local é imediata; o histórico é anexado pelo bridge
      setTimeout(() => void refreshHistory(), 900);
    }
  };

  const openItem = async (item: NotificationItem) => {
    if (!user) return;
    await markRead(user.uid, item.id);
    setHistory(
      (current) => current?.map((n) => (n.id === item.id ? { ...n, read: true } : n)) ?? null,
    );
    if (item.route) {
      router.push(item.route as Href);
    }
  };

  const clearAll = async () => {
    if (!user) return;
    await clearHistory(user.uid);
    setHistory([]);
    setNotice({ ok: true, text: "Histórico limpo." });
  };

  if (authLoading) {
    return <Loading label="Verificando sua sessão…" />;
  }
  if (!user) {
    return (
      <Screen title="Notificações" scroll={false}>
        <EmptyState
          icon="notifications-outline"
          title="Entre para ativar."
          message="Os avisos de pedidos, lançamentos e promoções ficam na sua conta Cliffhanger."
          actionLabel="Entrar"
          onAction={() => router.push("/account")}
        />
      </Screen>
    );
  }
  if (permission === null || history === null) {
    return (
      <Screen title="Notificações" scroll={false}>
        <Loading label="Carregando notificações…" />
      </Screen>
    );
  }

  const status = STATUS_TONE[permission];
  const statusCopy = STATUS_COPY[permission];

  return (
    <Screen title="Notificações" onRefresh={onRefresh} refreshing={refreshing}>
      <View style={{ paddingTop: 16, paddingHorizontal: ScreenPadding, gap: 14 }}>
        {notice ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              padding: 12,
              borderRadius: Radius.sm,
              backgroundColor: Colors.surface,
              borderWidth: 1,
              borderColor: notice.ok ? Colors.accent : Colors.warning,
            }}
          >
            <Ionicons
              name={notice.ok ? "checkmark-circle" : "alert-circle-outline"}
              size={18}
              color={notice.ok ? Colors.accent : Colors.warning}
            />
            <Text style={{ flex: 1, fontFamily: Fonts.body, fontSize: 13, color: Colors.text }}>
              {notice.text}
            </Text>
          </View>
        ) : null}

        {/* status da permissão */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            padding: 16,
            borderRadius: Radius.md,
            backgroundColor: Colors.surface,
            borderWidth: 1,
            borderColor: Colors.border,
          }}
        >
          <Ionicons name={status.icon} size={26} color={status.color} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text
              style={{ fontFamily: Fonts.bodySemi, fontSize: 14.5, color: Colors.text }}
            >
              {statusCopy.title}
            </Text>
            <Text
              style={{
                fontFamily: Fonts.body,
                fontSize: 12.5,
                lineHeight: 17,
                color: Colors.textMuted,
              }}
            >
              {statusCopy.message}
            </Text>
          </View>
        </View>

        {supported && permission !== "granted" ? (
          <Button label="Ativar notificações" loading={busy} onPress={() => void enable()} />
        ) : null}
        {supported && permission === "granted" ? (
          <Button
            label="Enviar notificação de teste"
            variant="secondary"
            loading={busy}
            onPress={() => void runTest()}
          />
        ) : null}

        {/* o que a loja avisa (§12.3) */}
        <View
          style={{
            padding: 16,
            borderRadius: Radius.md,
            backgroundColor: Colors.surface,
            borderWidth: 1,
            borderColor: Colors.border,
            gap: 12,
          }}
        >
          <Text
            style={{
              fontFamily: Fonts.bodySemi,
              fontSize: 11,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: Colors.textFaint,
            }}
          >
            O que você recebe
          </Text>
          {PROMISES.map((item) => (
            <View key={item.label} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name={item.icon} size={17} color={Colors.accent} />
              <Text style={{ flex: 1, fontFamily: Fonts.body, fontSize: 13, color: Colors.text }}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>

        {/* histórico local */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <Text
            style={{
              fontFamily: Fonts.bodySemi,
              fontSize: 11,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: Colors.textFaint,
            }}
          >
            Histórico
          </Text>
          {history.length > 0 ? (
            <Pressable onPress={() => void clearAll()} hitSlop={8}>
              <Text
                style={{
                  fontFamily: Fonts.bodyMedium,
                  fontSize: 12,
                  color: Colors.textMuted,
                  textDecorationLine: "underline",
                }}
              >
                Limpar
              </Text>
            </Pressable>
          ) : null}
        </View>

        {history.length === 0 ? (
          <EmptyState
            compact
            icon="notifications-off-outline"
            title="Nenhuma notificação ainda."
            message="Quando chegar um aviso — pedido, lançamento, promoção — ele aparece nesta lista."
          />
        ) : (
          <View style={{ gap: 10 }}>
            {history.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => void openItem(item)}
                style={({ pressed }) => [
                  {
                    padding: 14,
                    borderRadius: Radius.md,
                    backgroundColor: Colors.surface,
                    borderWidth: 1,
                    borderColor: item.read ? Colors.border : Colors.primary,
                    gap: 6,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Ionicons
                    name={item.read ? "notifications-outline" : "notifications"}
                    size={15}
                    color={item.read ? Colors.textFaint : Colors.accent}
                  />
                  <Text
                    numberOfLines={1}
                    style={{
                      flex: 1,
                      fontFamily: Fonts.bodySemi,
                      fontSize: 13.5,
                      color: Colors.text,
                    }}
                  >
                    {item.title}
                  </Text>
                  {item.read ? null : (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: Colors.accent,
                      }}
                    />
                  )}
                </View>
                <Text
                  numberOfLines={2}
                  style={{
                    fontFamily: Fonts.body,
                    fontSize: 12.5,
                    lineHeight: 17,
                    color: Colors.textMuted,
                  }}
                >
                  {item.body}
                </Text>
                <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: Colors.textFaint }}>
                  {formatDate(item.receivedAt) ?? "—"}
                  {item.read ? "" : " · não lida"}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

/**
 * NotificationsBridge — fica dentro do AuthProvider (layout raiz) e cuida da
 * vida das notificações (Doc Mestre §10/§12.3):
 * - notificações recebidas em 1º plano entram no histórico local do usuário;
 * - toques (inclusive abertura fria do app) gravam no histórico e navegam
 *   para a rota em `data.route` (allowlist — nada de navegação arbitrária);
 * - ao logar com a permissão já concedida, sincroniza o token push do
 *   dispositivo em users/{uid}.pushTokens sem pedir nada de novo.
 */
import { router, useRootNavigationState, type Href } from "expo-router";
import { useEffect, useRef } from "react";

import { addReceiveListener, getPushPermission, registerPush, useNotificationTap } from "@/lib/notifications";
import { appendHistory } from "@/lib/notificationsStore";
import { useAuth } from "@/lib/useAuth";

/** Rotas que uma notificação pode abrir — sempre telas reais do app. */
const ROUTES: Record<string, Href> = {
  "/": "/",
  "/shop": "/shop",
  "/library": "/library",
  "/orders": "/orders",
  "/cart": "/cart",
  "/notifications": "/notifications",
};

function routeOf(data: Record<string, unknown>): Href {
  const raw = typeof data.route === "string" ? data.route : "";
  return ROUTES[raw] ?? "/";
}

export function NotificationsBridge() {
  const { user } = useAuth();
  const navState = useRootNavigationState();
  const tap = useNotificationTap();

  const uidRef = useRef<string | null>(null);
  const handledRef = useRef<string | null>(null);
  const syncedUidRef = useRef<string | null>(null);

  useEffect(() => {
    uidRef.current = user?.uid ?? null;
  }, [user]);

  // recebidas em 1º plano → histórico (dedupe por id evita duplicar no toque)
  useEffect(() => {
    const subscription = addReceiveListener((n) => {
      const uid = uidRef.current;
      if (!uid) return;
      void appendHistory(uid, {
        id: n.id,
        title: n.title,
        body: n.body,
        route: String(routeOf(n.data)),
        receivedAt: new Date().toISOString(),
        read: false,
      });
    });
    return () => subscription.remove();
  }, []);

  // toque → histórico + navegação; espera o estado de navegação existir
  // (cold start) e processa cada notificação uma única vez.
  useEffect(() => {
    if (!tap || !navState?.key || handledRef.current === tap.id) return;
    handledRef.current = tap.id;
    const uid = uidRef.current;
    if (uid) {
      void appendHistory(uid, {
        id: tap.id,
        title: tap.title,
        body: tap.body,
        route: String(routeOf(tap.data)),
        receivedAt: new Date().toISOString(),
        read: false,
      });
    }
    router.push(routeOf(tap.data));
  }, [tap, navState?.key]);

  // sessão ativa + permissão já concedida → registra o token (melhor esforço)
  useEffect(() => {
    if (!user) {
      syncedUidRef.current = null;
      return;
    }
    if (syncedUidRef.current === user.uid) return;
    void (async () => {
      const permission = await getPushPermission();
      if (permission !== "granted") return;
      syncedUidRef.current = user.uid;
      await registerPush(user.uid);
    })();
  }, [user]);

  return null;
}

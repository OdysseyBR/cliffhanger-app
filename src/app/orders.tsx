/**
 * Meus pedidos (Doc Mestre §7.6/§22 — espelho de /pedidos): histórico do
 * cliente logado com status (Aguardando pagamento → Entregue), total,
 * pagamento e itens.
 */
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Loading, Screen } from "@/components/Screen";
import { Colors, Fonts, Radius, ScreenPadding, useThemeColors } from "@/constants/theme";
import { ApiError, loadOrders } from "@/lib/api";
import { formatBRL, formatDate } from "@/lib/catalog";
import type { Order, OrderStatus, PaymentMethod } from "@/lib/types";
import { useAuth } from "@/lib/useAuth";

const STATUS_LABEL: Record<OrderStatus, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  pagamento_aprovado: "Pagamento aprovado",
  em_separacao: "Em separação",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

/** Tom do chip: amarelo = espera, roxo = em andamento, amarelo sólido = envio/entrega. */
const STATUS_TONE: Record<OrderStatus, { fg: string; bg: string; border: string }> = {
  aguardando_pagamento: { fg: Colors.accent, bg: "transparent", border: Colors.accent },
  pagamento_aprovado: { fg: Colors.text, bg: Colors.primary, border: Colors.primary },
  em_separacao: { fg: Colors.text, bg: Colors.primary, border: Colors.primary },
  enviado: { fg: Colors.onAccent, bg: Colors.accent, border: Colors.accent },
  entregue: { fg: Colors.onAccent, bg: Colors.accent, border: Colors.accent },
  cancelado: { fg: Colors.warning, bg: "transparent", border: Colors.warning },
};

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  pix: "PIX",
  credito: "Cartão de crédito",
  debito: "Cartão de débito",
};

export default function OrdersScreen() {
  useThemeColors();
  const { user, loading: authLoading, getIdToken } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const started = useRef(false);

  const fetchOrders = useCallback(async (): Promise<void> => {
    try {
      const token = await getIdToken();
      if (!token) return;
      const data = await loadOrders(token);
      setOrders(data.orders);
      setError(null);
    } catch (cause: unknown) {
      setError(
        cause instanceof ApiError ? cause.message : "Não foi possível carregar seus pedidos.",
      );
    }
  }, [getIdToken]);

  useEffect(() => {
    if (user && !started.current) {
      started.current = true;
      void fetchOrders();
    }
  }, [user, fetchOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  if (authLoading) {
    return <Loading label="Verificando sua sessão…" />;
  }
  if (!user) {
    return (
      <Screen title="Meus pedidos" scroll={false}>
        <EmptyState
          icon="receipt-outline"
          title="Entre para acompanhar."
          message="Seus pedidos ficam na sua conta Cliffhanger — a mesma da loja."
          actionLabel="Entrar"
          onAction={() => router.push("/account")}
        />
      </Screen>
    );
  }
  if (!orders && !error) {
    return (
      <Screen title="Meus pedidos" scroll={false}>
        <Loading label="Carregando pedidos…" />
      </Screen>
    );
  }
  if (!orders) {
    return (
      <Screen title="Meus pedidos" scroll={false}>
        <EmptyState
          icon="cloud-offline-outline"
          title="Não foi possível carregar."
          message={error ?? "Tente novamente em instantes."}
          actionLabel="Tentar novamente"
          onAction={() => void fetchOrders()}
        />
      </Screen>
    );
  }
  if (orders.length === 0) {
    return (
      <Screen title="Meus pedidos" scroll={false}>
        <EmptyState
          icon="receipt-outline"
          title="Você ainda não fez pedidos."
          message="Quando comprar na loja ou aqui pelo app, o pedido aparece nesta lista."
          actionLabel="Ver a loja"
          onAction={() => router.replace("/shop")}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Meus pedidos"
      onRefresh={onRefresh}
      refreshing={refreshing}
    >
      <View style={{ paddingTop: 16, paddingHorizontal: ScreenPadding, gap: 14 }}>
        <Text
          style={{
            fontFamily: Fonts.body,
            fontSize: 13,
            lineHeight: 18,
            color: Colors.textMuted,
          }}
        >
          Acompanhe seus pedidos — do pagamento até a entrega.
        </Text>

        {error ? (
          <Text style={{ fontFamily: Fonts.body, fontSize: 12.5, color: Colors.warning }}>
            {error}
          </Text>
        ) : null}

        {orders.map((order) => (
          <View
            key={order.id}
            style={{
              padding: 16,
              borderRadius: Radius.md,
              backgroundColor: Colors.surface,
              borderWidth: 1,
              borderColor: Colors.border,
              gap: 10,
            }}
          >
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
                  fontFamily: Fonts.bodyBold,
                  fontSize: 15,
                  letterSpacing: 0.8,
                  color: Colors.text,
                }}
              >
                {order.code}
              </Text>
              <StatusChip status={order.status} />
            </View>

            <View style={{ height: 1, backgroundColor: Colors.line }} />

            <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.textFaint }}>
              {formatDate(order.createdAt) ?? "—"} · {PAYMENT_LABEL[order.paymentMethod]}
            </Text>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1, gap: 3 }}>
                {order.items.slice(0, 2).map((item) => (
                  <Text
                    key={item.productId}
                    numberOfLines={1}
                    style={{
                      fontFamily: Fonts.body,
                      fontSize: 12.5,
                      lineHeight: 16,
                      color: Colors.textMuted,
                    }}
                  >
                    {item.qty} × {item.title}
                  </Text>
                ))}
                {order.items.length > 2 ? (
                  <Text style={{ fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textFaint }}>
                    …e mais {order.items.length - 2}{" "}
                    {order.items.length - 2 === 1 ? "item" : "itens"}
                  </Text>
                ) : null}
              </View>
              <View style={{ alignItems: "flex-end", gap: 3 }}>
                <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.accent }}>
                  {formatBRL(order.total)}
                </Text>
                <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: Colors.textFaint }}>
                  {order.items.reduce((sum, item) => sum + item.qty, 0)}{" "}
                  {order.items.reduce((sum, item) => sum + item.qty, 0) === 1 ? "item" : "itens"}
                </Text>
              </View>
            </View>

            {order.address ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Ionicons name="location-outline" size={12} color={Colors.textFaint} />
                <Text
                  numberOfLines={1}
                  style={{
                    flex: 1,
                    fontFamily: Fonts.body,
                    fontSize: 11.5,
                    color: Colors.textFaint,
                  }}
                >
                  {order.address.street}, {order.address.number} — {order.address.city}/
                  {order.address.state}
                </Text>
              </View>
            ) : null}

            {order.status === "aguardando_pagamento" ? (
              <Button
                label="Pagar agora"
                onPress={() => router.push({ pathname: "/pay/[id]", params: { id: order.id } })}
                style={{ minHeight: 44 }}
              />
            ) : null}
          </View>
        ))}
      </View>
    </Screen>
  );
}

function StatusChip({ status }: { status: OrderStatus }) {
  const tone = STATUS_TONE[status];
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: Radius.pill,
        borderWidth: 1,
        borderColor: tone.border,
        backgroundColor: tone.bg,
      }}
    >
      <Text
        style={{
          fontFamily: Fonts.bodyBold,
          fontSize: 10,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color: tone.fg,
        }}
      >
        {STATUS_LABEL[status]}
      </Text>
    </View>
  );
}

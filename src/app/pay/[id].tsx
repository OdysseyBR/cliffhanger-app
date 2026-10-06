/**
 * Pagar pedido (§7.4) — reabre a cobrança de um pedido que ficou
 * "aguardando_pagamento" (botão "Pagar agora" em Meus pedidos):
 *  - PIX: gera o QR Code (cobrança idempotente) + polling até cair;
 *  - cartão: form com criptografia no aparelho + cobrança em um passo.
 * Espelho da tela de conclusão do checkout.
 */
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/Button";
import { CardForm, type CardFormHandle } from "@/components/CardForm";
import { EmptyState } from "@/components/EmptyState";
import { PixPanel } from "@/components/PixPanel";
import { Loading, Screen } from "@/components/Screen";
import { Colors, Fonts, Radius, ScreenPadding, useThemeColors } from "@/constants/theme";
import { ApiError, chargeCard, chargePix, loadOrders } from "@/lib/api";
import { formatBRL } from "@/lib/catalog";
import type { Order, OrderStatus, PaymentMethod, PixCharge } from "@/lib/types";
import { useAuth } from "@/lib/useAuth";
import { usePaymentPolling } from "@/lib/usePaymentPolling";

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  pix: "PIX",
  credito: "Cartão de crédito",
  debito: "Cartão de débito",
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  pagamento_aprovado: "Pagamento aprovado",
  em_separacao: "Em separação",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export default function PayScreen() {
  useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, loading: authLoading, getIdToken } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [payStatus, setPayStatus] = useState<OrderStatus>("aguardando_pagamento");
  const [pix, setPix] = useState<PixCharge | null>(null);
  const [pixBusy, setPixBusy] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const cardRef = useRef<CardFormHandle>(null);
  const started = useRef(false);
  const autoPix = useRef(false);

  const fetchOrder = useCallback(async (): Promise<void> => {
    try {
      const token = await getIdToken();
      if (!token) return;
      const data = await loadOrders(token);
      const found = data.orders.find((o) => o.id === id) ?? null;
      setOrder(found);
      if (found) setPayStatus(found.status);
      setError(null);
    } catch (cause: unknown) {
      setError(cause instanceof ApiError ? cause.message : "Não foi possível carregar o pedido.");
    } finally {
      setReady(true);
    }
  }, [getIdToken, id]);

  useEffect(() => {
    if (user && !started.current) {
      started.current = true;
      void fetchOrder();
    }
  }, [user, fetchOrder]);

  const startPix = useCallback(async () => {
    if (!order) return;
    setPixBusy(true);
    setPayError(null);
    try {
      const outcome = await chargePix(order.id);
      if (outcome.pix) setPix(outcome.pix);
      else setPayError("Não foi possível gerar o código PIX.");
    } catch (cause: unknown) {
      setPayError(
        cause instanceof ApiError ? cause.message : "Não foi possível gerar o código PIX.",
      );
    } finally {
      setPixBusy(false);
    }
  }, [order]);

  // PIX — gera o QR uma vez; "Gerar novo código" fica por conta do Painel
  useEffect(() => {
    if (!order || order.paymentMethod !== "pix" || payStatus !== "aguardando_pagamento") return;
    if (autoPix.current) return;
    autoPix.current = true;
    void startPix();
  }, [order, payStatus, startPix]);

  // §7.4 — polling até o pagamento cair (o webhook confirma no servidor)
  usePaymentPolling(order && payStatus === "aguardando_pagamento" ? order.id : null, setPayStatus);

  const payCard = async () => {
    if (!order || paying) return;
    setPaying(true);
    setPayError(null);
    try {
      const payload = await cardRef.current?.encrypt();
      if (!payload) return; // CardForm já explica o erro do formulário
      const outcome = await chargeCard(order.id, order.paymentMethod, payload);
      setPendingMessage(outcome.message ?? null);
      setPayStatus(outcome.status);
    } catch (cause: unknown) {
      setPayError(
        cause instanceof ApiError ? cause.message : "Não foi possível processar o pagamento.",
      );
    } finally {
      setPaying(false);
    }
  };

  if (authLoading) {
    return <Loading label="Verificando sua sessão…" />;
  }
  if (!user) {
    return (
      <Screen title="Pagar pedido" scroll={false}>
        <EmptyState
          icon="card-outline"
          title="Entre para pagar."
          message="O pagamento fica na sua conta Cliffhanger — a mesma da loja."
          actionLabel="Entrar"
          onAction={() => router.push("/account")}
        />
      </Screen>
    );
  }
  if (!ready) {
    return (
      <Screen title="Pagar pedido" scroll={false}>
        <Loading label="Carregando pedido…" />
      </Screen>
    );
  }
  if (error && !order) {
    return (
      <Screen title="Pagar pedido" scroll={false}>
        <EmptyState
          icon="cloud-offline-outline"
          title="Não foi possível carregar."
          message={error}
          actionLabel="Tentar novamente"
          onAction={() => void fetchOrder()}
        />
      </Screen>
    );
  }
  if (!order) {
    return (
      <Screen title="Pagar pedido" scroll={false}>
        <EmptyState
          icon="receipt-outline"
          title="Pedido não encontrado."
          message="Ele pode ter sido removido ou pertence a outra conta."
          actionLabel="Ver meus pedidos"
          onAction={() => router.replace("/orders")}
        />
      </Screen>
    );
  }

  const approved = payStatus === "pagamento_aprovado";
  const waiting = payStatus === "aguardando_pagamento";

  // saiu de "aguardando" por outro motivo (ex.: cancelado pelo suporte)
  if (!waiting && !approved) {
    return (
      <Screen title="Pagar pedido" scroll={false}>
        <EmptyState
          icon="receipt-outline"
          title={STATUS_LABEL[payStatus]}
          message="Este pedido não está mais aguardando pagamento."
          actionLabel="Ver meus pedidos"
          onAction={() => router.replace("/orders")}
        />
      </Screen>
    );
  }

  const digital = order.items.some((item) => item.digital);

  return (
    <Screen title={approved ? "Pagamento" : "Pagar pedido"}>
      <View
        style={{
          paddingTop: 16,
          paddingHorizontal: ScreenPadding,
          paddingBottom: 32,
          gap: 14,
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: approved ? Colors.accent : "transparent",
            borderWidth: approved ? 0 : 2,
            borderColor: Colors.accent,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={
              approved
                ? "checkmark"
                : order.paymentMethod === "pix"
                  ? "qr-code-outline"
                  : "card-outline"
            }
            size={34}
            color={approved ? Colors.onAccent : Colors.accent}
          />
        </View>
        <Text
          style={{
            fontFamily: Fonts.display,
            fontSize: 28,
            letterSpacing: 1.4,
            color: Colors.text,
            textAlign: "center",
          }}
        >
          {approved ? "PAGAMENTO APROVADO" : "PAGAR PEDIDO"}
        </Text>
        <Text
          style={{
            fontFamily: Fonts.body,
            fontSize: 13.5,
            color: Colors.textMuted,
            textAlign: "center",
          }}
        >
          Pedido {order.code} · {formatBRL(order.total)} ·{" "}
          {PAYMENT_LABEL[order.paymentMethod]}
        </Text>
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: Radius.pill,
            borderWidth: 1,
            borderColor: Colors.accent,
          }}
        >
          <Text
            style={{
              fontFamily: Fonts.bodyBold,
              fontSize: 10.5,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              color: Colors.accent,
            }}
          >
            {approved ? "Pagamento aprovado" : "Aguardando pagamento"}
          </Text>
        </View>

        {approved ? (
          digital ? (
            <View
              style={{
                alignSelf: "stretch",
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                padding: 12,
                borderRadius: Radius.md,
                borderWidth: 1,
                borderColor: Colors.border,
                backgroundColor: Colors.surface,
              }}
            >
              <Ionicons name="library-outline" size={18} color={Colors.accent} />
              <Text
                style={{
                  flex: 1,
                  fontFamily: Fonts.body,
                  fontSize: 12.5,
                  lineHeight: 17,
                  color: Colors.textMuted,
                }}
              >
                Os itens digitais já estão na sua Biblioteca — leia ou ouça pelo app.
              </Text>
            </View>
          ) : null
        ) : order.paymentMethod === "pix" ? (
          pix ? (
            <PixPanel orderId={order.id} pix={pix} onRenew={setPix} />
          ) : (
            <View style={{ alignSelf: "stretch", gap: 10 }}>
              <Text
                style={{
                  fontFamily: Fonts.body,
                  fontSize: 12.5,
                  lineHeight: 17,
                  color: payError ? Colors.warning : Colors.textMuted,
                  textAlign: "center",
                }}
              >
                {payError ?? (pixBusy ? "Gerando o código PIX…" : "")}
              </Text>
              {!pixBusy && payError ? (
                <Button label="Tentar de novo" variant="secondary" onPress={() => void startPix()} />
              ) : null}
            </View>
          )
        ) : (
          <View style={{ alignSelf: "stretch", gap: 14 }}>
            <CardForm
              ref={cardRef}
              total={order.total}
              method={order.paymentMethod}
              holderDefault={order.customer?.name}
            />
            <Button
              label={`Pagar ${formatBRL(order.total)}`}
              loading={paying}
              disabled={paying}
              onPress={() => void payCard()}
            />
            {payError ? (
              <Text
                style={{
                  fontFamily: Fonts.body,
                  fontSize: 12.5,
                  lineHeight: 17,
                  color: Colors.warning,
                }}
              >
                {payError}
              </Text>
            ) : null}
          </View>
        )}

        {waiting && order.paymentMethod === "pix" && pix ? (
          <Text
            style={{
              fontFamily: Fonts.body,
              fontSize: 12.5,
              lineHeight: 17,
              color: Colors.textMuted,
              textAlign: "center",
            }}
          >
            Assim que o PIX for confirmado, o pedido sai de Aguardando pagamento — a confirmação é
            automática.
          </Text>
        ) : null}
        {waiting && order.paymentMethod !== "pix" && pendingMessage ? (
          <Text
            style={{
              fontFamily: Fonts.body,
              fontSize: 12.5,
              lineHeight: 17,
              color: Colors.textMuted,
              textAlign: "center",
            }}
          >
            {pendingMessage}
          </Text>
        ) : null}

        <View style={{ alignSelf: "stretch", gap: 10 }}>
          <Button
            label="Ver meus pedidos"
            variant={approved ? "primary" : "secondary"}
            onPress={() => router.replace("/orders")}
          />
          <Button
            label="Continuar comprando"
            variant={approved ? "secondary" : "primary"}
            onPress={() => router.replace("/shop")}
          />
        </View>
      </View>
    </Screen>
  );
}

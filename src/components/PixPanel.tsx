/**
 * Painel PIX (§7.4) — QR Code + código copia-e-cola + validade, com
 * renovação quando o código expira (o servidor reaproveita a cobrança
 * ativa e só gera novo QR quando a anterior venceu).
 */
import { Image } from "expo-image";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { Text, View, type ViewStyle } from "react-native";

import { Button } from "@/components/Button";
import { Colors, Fonts, Radius } from "@/constants/theme";
import { ApiError, chargePix } from "@/lib/api";
import type { PixCharge } from "@/lib/types";

interface PixPanelProps {
  orderId: string;
  pix: PixCharge;
  onRenew: (pix: PixCharge) => void;
}

export function PixPanel({ orderId, pix, onRenew }: PixPanelProps) {
  const [copied, setCopied] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estilo vivo — recriado por render para ler o Colors do modo ativo.
  const CARD: ViewStyle = {
    alignSelf: "stretch",
    padding: 16,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
    alignItems: "center",
  };

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(pix.text);
      setCopied(true);
      setError(null);
    } catch {
      setError("Não foi possível copiar — selecione o código acima.");
    }
  };

  const renew = async () => {
    if (renewing) return;
    setRenewing(true);
    setError(null);
    try {
      const outcome = await chargePix(orderId);
      if (outcome.pix) onRenew(outcome.pix);
      else setError("Não foi possível gerar um novo código.");
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Não foi possível gerar um novo código.",
      );
    } finally {
      setRenewing(false);
    }
  };

  const expires = new Date(pix.expiresAt);
  const validUntil = Number.isNaN(expires.getTime())
    ? ""
    : expires.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });

  return (
    <View style={CARD}>
      <View style={{ gap: 4, alignItems: "center" }}>
        <Text
          style={{
            fontFamily: Fonts.bodyBold,
            fontSize: 14,
            letterSpacing: 0.6,
            color: Colors.text,
          }}
        >
          Pague com PIX
        </Text>
        <Text
          style={{
            fontFamily: Fonts.body,
            fontSize: 12.5,
            color: Colors.textMuted,
            textAlign: "center",
          }}
        >
          Escaneie no app do banco ou use o código copia-e-cola.
        </Text>
      </View>

      <View style={{ backgroundColor: "#FFFFFF", borderRadius: Radius.sm, padding: 8 }}>
        <Image
          source={{ uri: pix.image }}
          style={{ width: 200, height: 200 }}
          contentFit="contain"
          accessibilityLabel="QR Code PIX"
        />
      </View>

      {validUntil ? (
        <Text style={{ fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textFaint }}>
          Válido até {validUntil}
        </Text>
      ) : null}

      <View
        style={{
          alignSelf: "stretch",
          borderWidth: 1,
          borderColor: Colors.border,
          borderRadius: Radius.sm,
          backgroundColor: Colors.surfaceAlt,
          padding: 10,
        }}
      >
        <Text
          selectable
          numberOfLines={3}
          ellipsizeMode="middle"
          style={{
            fontFamily: Fonts.body,
            fontSize: 11.5,
            lineHeight: 16,
            color: Colors.textMuted,
          }}
        >
          {pix.text}
        </Text>
      </View>

      <Button
        label={copied ? "Código copiado ✓" : "Copiar código PIX"}
        onPress={() => void copy()}
        style={{ alignSelf: "stretch" }}
      />
      <Button
        label="Gerar novo código"
        variant="secondary"
        onPress={() => void renew()}
        loading={renewing}
        disabled={renewing}
        style={{ alignSelf: "stretch" }}
      />

      {error ? (
        <Text
          style={{
            fontFamily: Fonts.body,
            fontSize: 12.5,
            lineHeight: 17,
            color: Colors.warning,
            textAlign: "center",
          }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

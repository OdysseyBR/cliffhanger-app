/**
 * Dados do cartão (§7.3/§7.4) — form com a identidade; o número é
 * criptografado no aparelho pelo SDK do PagBank e só o criptograma sai.
 * Uso: o checkout segura um ref e chama `encrypt()` ao avançar para
 * Revisão — erro de cartão aparece ANTES de criar o pedido.
 *
 * Caminho de criptografia:
 *  - web: script do SDK na página (mesmo do site);
 *  - nativo: WebView oculta (1×1, montada só durante a criptografia).
 */
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Text, View, type ViewStyle } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { Field } from "@/components/Field";
import { Colors, Fonts, Radius } from "@/constants/theme";
import { formatBRL } from "@/lib/catalog";
import {
  encryptCardWeb,
  encryptErrorLabel,
  encryptWebViewHtml,
  isWeb,
  type CardEncryptInput,
} from "@/lib/cardCrypto";
import type { CardPayload, PaymentMethod } from "@/lib/types";

export interface CardFormHandle {
  /** Valida + criptografa; devolve o payload da cobrança ou null (erro na tela). */
  encrypt: () => Promise<CardPayload | null>;
}

interface CardFormProps {
  total: number;
  method: PaymentMethod;
  /** nome do comprador — sugestão do nome impresso no cartão */
  holderDefault?: string;
}

const CARD: ViewStyle = {
  padding: 16,
  borderRadius: Radius.md,
  backgroundColor: Colors.surface,
  borderWidth: 1,
  borderColor: Colors.border,
};

type NativeMsg =
  | { type: "ready" }
  | { type: "result"; encrypted: string }
  | { type: "error"; code: string };

export const CardForm = forwardRef<CardFormHandle, CardFormProps>(function CardForm(
  { total, method, holderDefault },
  ref,
) {
  const [number, setNumber] = useState("");
  const [holder, setHolder] = useState("");
  const [exp, setExp] = useState("");
  const [cvv, setCvv] = useState("");
  const [installments, setInstallments] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // WebView nativa — montada só durante a criptografia
  const [encryptingNative, setEncryptingNative] = useState(false);
  const [html] = useState(() => (isWeb ? "" : encryptWebViewHtml()));
  const webReady = useRef(false);
  const webRef = useRef<WebView>(null);
  const pending = useRef<{
    input: CardEncryptInput;
    resolve: (encrypted: string) => void;
    reject: (cause: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  const formatNumber = (value: string) =>
    value
      .replace(/\D/g, "")
      .slice(0, 16)
      .replace(/(\d{4})(?=\d)/g, "$1 ")
      .trim();

  const formatExp = (value: string) => {
    const d = value.replace(/\D/g, "").slice(0, 4);
    return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`;
  };

  const validate = (): string | null => {
    const digits = number.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 16) return "Número do cartão inválido.";
    const match = /^(\d{2})\/(\d{2})$/.exec(exp.trim());
    if (!match) return "Validade do cartão no formato MM/AA.";
    const month = Number(match[1]);
    if (month < 1 || month > 12) return "Mês de validade inválido.";
    const year = 2000 + Number(match[2]);
    const now = new Date();
    if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
      return "Cartão vencido — confira a validade.";
    }
    if (cvv.replace(/\D/g, "").length < 3) return "Código de segurança inválido.";
    if (!holder.trim() && !holderDefault?.trim()) return "Informe o nome impresso no cartão.";
    return null;
  };

  const settleNative = (fn: (p: NonNullable<typeof pending.current>) => void) => {
    const p = pending.current;
    if (!p) return;
    clearTimeout(p.timer);
    pending.current = null;
    webReady.current = false;
    setEncryptingNative(false);
    fn(p);
  };

  const injectNow = () => {
    const p = pending.current;
    if (!p || !webRef.current) return;
    webRef.current.injectJavaScript(
      `window.__encryptCard && window.__encryptCard(${JSON.stringify(
        JSON.stringify(p.input),
      )}); true;`,
    );
  };

  const encryptNative = (input: CardEncryptInput): Promise<string> =>
    new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        settleNative((p) => p.reject(new Error(encryptErrorLabel("SDK_TIMEOUT"))));
      }, 30000);
      pending.current = { input, resolve, reject, timer };
      setEncryptingNative(true);
      // se a WebView já está pronta (reuso), injeta na hora
      if (webReady.current) injectNow();
    });

  const handleMessage = (event: WebViewMessageEvent) => {
    let msg: NativeMsg;
    try {
      msg = JSON.parse(event.nativeEvent.data) as NativeMsg;
    } catch {
      return;
    }
    if (msg.type === "ready") {
      webReady.current = true;
      injectNow();
      return;
    }
    if (msg.type === "result") {
      settleNative((p) => p.resolve(msg.encrypted));
      return;
    }
    if (msg.type === "error") {
      settleNative((p) => p.reject(new Error(encryptErrorLabel(msg.code))));
    }
  };

  useImperativeHandle(ref, () => ({
    encrypt: async () => {
      const message = validate();
      if (message) {
        setError(message);
        return null;
      }
      setError(null);
      setBusy(true);
      try {
        const input: CardEncryptInput = {
          holder: (holder.trim() || holderDefault?.trim() || "").trim().toUpperCase(),
          number: number.replace(/\D/g, ""),
          expMonth: exp.slice(0, 2),
          expYear: `20${exp.slice(3, 5)}`,
          securityCode: cvv.replace(/\D/g, ""),
        };
        const encrypted = isWeb
          ? await encryptCardWeb(input)
          : await encryptNative(input);
        return {
          encrypted,
          expMonth: input.expMonth,
          expYear: input.expYear,
          installments: method === "credito" ? installments : 1,
          holder: input.holder,
        };
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Não foi possível criptografar o cartão.");
        return null;
      } finally {
        setBusy(false);
      }
    },
  }));

  return (
    <View style={[CARD, { gap: 10 }]}>
      <Text
        style={{
          fontFamily: Fonts.bodyBold,
          fontSize: 14,
          letterSpacing: 0.6,
          color: Colors.text,
        }}
      >
        Dados do cartão
      </Text>

      <Field
        label="Número do cartão"
        value={number}
        onChangeText={(text) => setNumber(formatNumber(text))}
        placeholder="0000 0000 0000 0000"
        keyboardType="numeric"
        autoComplete="cc-number"
        maxLength={19}
      />
      <Field
        label="Nome impresso no cartão"
        value={holder}
        onChangeText={(text) => setHolder(text.toUpperCase())}
        placeholder="Como impresso no cartão"
        autoCapitalize="characters"
        autoComplete="cc-name"
      />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Validade"
            value={exp}
            onChangeText={(text) => setExp(formatExp(text))}
            placeholder="MM/AA"
            keyboardType="numeric"
            autoComplete="cc-exp"
            maxLength={5}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="Código de segurança"
            value={cvv}
            onChangeText={(text) => setCvv(text.replace(/\D/g, "").slice(0, 4))}
            placeholder="CVV"
            keyboardType="numeric"
            autoComplete="cc-csc"
            maxLength={4}
          />
        </View>
      </View>

      {method === "credito" ? (
        <View style={{ gap: 6 }}>
          <Text
            style={{
              fontFamily: Fonts.bodyMedium,
              fontSize: 11,
              letterSpacing: 1.4,
              color: Colors.textMuted,
              textTransform: "uppercase",
            }}
          >
            Parcelas
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {[1, 2, 3, 4, 5, 6].map((n) => {
              const active = installments === n;
              return (
                <Text
                  key={n}
                  onPress={() => setInstallments(n)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  style={{
                    paddingVertical: 7,
                    paddingHorizontal: 11,
                    borderRadius: Radius.sm,
                    borderWidth: 1,
                    borderColor: active ? Colors.accent : Colors.border,
                    backgroundColor: active ? Colors.primary : "transparent",
                    fontFamily: active ? Fonts.bodyBold : Fonts.body,
                    fontSize: 11.5,
                    color: active ? Colors.accent : Colors.textMuted,
                    overflow: "hidden",
                  }}
                >
                  {n}x de {formatBRL(total / n)}
                </Text>
              );
            })}
          </View>
        </View>
      ) : null}

      {error ? (
        <Text
          style={{
            fontFamily: Fonts.body,
            fontSize: 12.5,
            lineHeight: 17,
            color: Colors.warning,
          }}
        >
          {error}
        </Text>
      ) : null}
      {busy ? (
        <Text
          style={{
            fontFamily: Fonts.bodyMedium,
            fontSize: 12,
            lineHeight: 17,
            color: Colors.accent,
          }}
        >
          Criptografando o cartão com o SDK do PagBank…
        </Text>
      ) : null}

      <Text
        style={{
          fontFamily: Fonts.body,
          fontSize: 11.5,
          lineHeight: 16,
          color: Colors.textFaint,
        }}
      >
        {`Os dados do cartão são criptografados ${isWeb ? "no seu navegador" : "no seu aparelho"} pelo SDK do PagBank — nenhum número de cartão passa pelos servidores da loja.`}
      </Text>

      {!isWeb && encryptingNative ? (
        <WebView
          ref={webRef}
          originWhitelist={["*"]}
          source={{ html }}
          javaScriptEnabled
          domStorageEnabled
          onMessage={handleMessage}
          style={{
            width: 1,
            height: 1,
            opacity: 0,
            position: "absolute",
            right: 0,
            bottom: 0,
          }}
        />
      ) : null}
    </View>
  );
});

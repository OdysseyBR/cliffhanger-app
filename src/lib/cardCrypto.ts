/**
 * Criptografia do cartão (§7.4): o número só sai do aparelho como
 * criptograma do SDK do PagBank — os servidores da loja nunca veem o
 * cartão em texto puro (mesma garantia do checkout do site).
 *  - Web: script do SDK carregado na página (caminho do site);
 *  - Nativo: WebView oculta executa o MESMO script (o SDK precisa de DOM).
 */
import { Platform } from "react-native";

export const PAGSEGURO_SDK_URL =
  "https://assets.pagseguro.com.br/checkout-sdk-js/rc/dist/browser/pagseguro.min.js";

export interface CardEncryptInput {
  holder: string;
  number: string;
  expMonth: string;
  expYear: string;
  securityCode: string;
}

/** Chave pública do PagBank (EXPO_PUBLIC — mesma do site). */
export function cardPublicKey(): string {
  const key = process.env.EXPO_PUBLIC_PAGBANK_PUBLIC_KEY ?? "";
  if (!key) {
    throw new Error("Pagamento por cartão indisponível neste ambiente.");
  }
  return key;
}

/** Mensagens pt-BR para os códigos de erro do SDK. */
export function encryptErrorLabel(code: string): string {
  switch (code) {
    case "INVALID_NUMBER":
      return "Número de cartão inválido.";
    case "INVALID_SECURITY_CODE":
      return "Código de segurança inválido.";
    case "INVALID_EXPIRATION_MONTH":
      return "Mês de validade inválido.";
    case "INVALID_EXPIRATION_YEAR":
      return "Ano de validade inválido.";
    case "INVALID_EXPIRATION":
      return "Validade do cartão inválida.";
    case "INVALID_HOLDER":
      return "Nome do portador inválido.";
    case "PUBLIC_KEY_NOT_FOUND":
    case "INVALID_PUBLIC_KEY":
      return "Chave de criptografia indisponível.";
    case "SDK_LOAD":
    case "SDK_TIMEOUT":
      return "Falha ao carregar o SDK do PagBank — verifique a internet.";
    default:
      return "Não foi possível criptografar o cartão.";
  }
}

// ---------------------------------------------------------------------------
// Web — script do SDK na página (espelho do checkout da loja)
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    PagSeguro?: {
      encryptCard: (data: {
        publicKey: string;
        holder: string;
        number: string;
        expMonth: string;
        expYear: string;
        securityCode: string;
      }) => {
        encryptedCard?: string;
        hasErrors?: boolean;
        errors?: { code: string; message: string }[];
      };
    };
  }
}

function loadPagSeguroSdk(): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error(encryptErrorLabel("SDK_LOAD")));
  }
  if (window.PagSeguro) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>("script[data-pagseguro]");
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error(encryptErrorLabel("SDK_LOAD"))));
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PAGSEGURO_SDK_URL;
    script.dataset.pagseguro = "true";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(encryptErrorLabel("SDK_LOAD")));
    document.body.appendChild(script);
    window.setTimeout(() => reject(new Error(encryptErrorLabel("SDK_TIMEOUT"))), 15000);
  });
}

/** Criptografa o cartão no navegador (web) e devolve o criptograma. */
export async function encryptCardWeb(input: CardEncryptInput): Promise<string> {
  await loadPagSeguroSdk();
  const publicKey = cardPublicKey();
  const result = window.PagSeguro?.encryptCard({
    publicKey,
    holder: input.holder,
    number: input.number.replace(/\D/g, ""),
    expMonth: input.expMonth,
    expYear: input.expYear,
    securityCode: input.securityCode.replace(/\D/g, ""),
  });
  if (!result || result.hasErrors || !result.encryptedCard) {
    const first = result?.errors?.[0];
    throw new Error(first ? encryptErrorLabel(first.code) : encryptErrorLabel("ENCRYPT_FAILED"));
  }
  return result.encryptedCard;
}

// ---------------------------------------------------------------------------
// Nativo — HTML da WebView oculta que roda o MESMO SDK no aparelho
// ---------------------------------------------------------------------------

/**
 * Página autossuficiente: carrega o SDK, avisa "ready" e expõe
 * `window.__encryptCard(json)` — o RN injeta os dados e recebe o
 * criptograma de volta por `ReactNativeWebView.postMessage`.
 */
export function encryptWebViewHtml(): string {
  const publicKey = JSON.stringify(cardPublicKey());
  const sdkUrl = JSON.stringify(PAGSEGURO_SDK_URL);
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body>
<script>
(function () {
  var post = function (m) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(m)); } catch (e) {}
  };
  var timer = setTimeout(function () { post({ type: "error", code: "SDK_TIMEOUT" }); }, 15000);
  var s = document.createElement("script");
  s.src = ${sdkUrl};
  s.async = true;
  s.onload = function () { clearTimeout(timer); post({ type: "ready" }); };
  s.onerror = function () { clearTimeout(timer); post({ type: "error", code: "SDK_LOAD" }); };
  document.body.appendChild(s);
  window.__encryptCard = function (payload) {
    try {
      var input = JSON.parse(payload);
      var r = window.PagSeguro.encryptCard({
        publicKey: ${publicKey},
        holder: input.holder,
        number: input.number,
        expMonth: input.expMonth,
        expYear: input.expYear,
        securityCode: input.securityCode
      });
      if (!r || r.hasErrors || !r.encryptedCard) {
        var first = r && r.errors && r.errors[0];
        post({ type: "error", code: first && first.code ? first.code : "ENCRYPT_FAILED" });
        return;
      }
      post({ type: "result", encrypted: r.encryptedCard });
    } catch (e) {
      post({ type: "error", code: "ENCRYPT_FAILED" });
    }
  };
})();
</script>
</body>
</html>`;
}

/** Plataforma atual — o form usa isso só para escolher o caminho de cripto. */
export const isWeb = Platform.OS === "web";

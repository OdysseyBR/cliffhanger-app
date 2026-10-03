/**
 * Cliente da API pública da Cliffhanger Store (mesmo backend do site).
 * Endpoints: /api/products (catálogo), /api/library (sessão/progresso) e o
 * checkout — /api/shipping, /api/coupons/validate, /api/orders,
 * /api/orders/mine e /api/account/addresses.
 */
import { STORE_URL } from "./firebase";
import type {
  Catalog,
  CheckoutPayload,
  CouponValidation,
  LibraryData,
  Order,
  OrderCreated,
  PublicReview,
  ReadingProgress,
  ReviewInput,
  SavedAddress,
  ShippingQuote,
} from "./types";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions {
  token?: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, method = "GET", body } = options;
  if (!STORE_URL) {
    throw new ApiError("Loja não configurada (EXPO_PUBLIC_STORE_URL ausente no .env).");
  }
  let res: Response;
  try {
    res = await fetch(`${STORE_URL}${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError("Sem conexão com a loja. Verifique sua internet.");
  }
  if (!res.ok) {
    let message = `Falha na requisição (${res.status}).`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* corpo não-JSON — mantém mensagem genérica */
    }
    throw new ApiError(message, res.status);
  }
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Catálogo — cache em memória com TTL (compartilhado entre as telas)
// ---------------------------------------------------------------------------

const CATALOG_TTL_MS = 5 * 60_000;

let catalogCache: { data: Catalog; at: number } | null = null;
let catalogInflight: Promise<Catalog> | null = null;

/**
 * URL absoluta de arquivo digital (aceita caminhos relativos colados no
 * admin). O leitor/player carrega o arquivo direto do host — os arquivos
 * da loja são do Cloudinary, que envia CORS para qualquer origem.
 */
export function resolveFileUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (!STORE_URL) return url;
  return `${STORE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

/** Catálogo em cache (sem ir à rede), se já carregado. */
export function peekCatalog(): Catalog | null {
  if (catalogCache && Date.now() - catalogCache.at < CATALOG_TTL_MS) {
    return catalogCache.data;
  }
  return null;
}

/** Carrega /api/products com cache + dedupe de requisições concorrentes. */
export function loadCatalog(force = false): Promise<Catalog> {
  if (!force && catalogCache && Date.now() - catalogCache.at < CATALOG_TTL_MS) {
    return Promise.resolve(catalogCache.data);
  }
  if (catalogInflight) return catalogInflight;
  catalogInflight = request<Catalog>("/api/products")
    .then((data) => {
      catalogCache = { data, at: Date.now() };
      return data;
    })
    .finally(() => {
      catalogInflight = null;
    });
  return catalogInflight;
}

// ---------------------------------------------------------------------------
// Biblioteca digital (sessão via Bearer do usuário)
// ---------------------------------------------------------------------------

export function loadLibrary(token: string): Promise<LibraryData> {
  return request<LibraryData>("/api/library", { token });
}

/**
 * Salva progresso/última posição (PUT /api/library/progress/{productId}).
 * Mesmo contrato do site: o PUT substitui o documento do produto na conta.
 * Retorna false em falha (melhor esforço — o estado local continua válido).
 */
export async function saveProgress(
  token: string,
  productId: string,
  patch: {
    kind: "ebook" | "audiobook";
    page?: number;
    pages?: number;
    percent: number;
    position?: number;
    bookmarks?: ReadingProgress["bookmarks"];
  },
): Promise<boolean> {
  if (!STORE_URL) return false;
  try {
    const res = await fetch(
      `${STORE_URL}/api/library/progress/${encodeURIComponent(productId)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Checkout (Lote 2 Etapa 2 — §7.2–§7.6)
// ---------------------------------------------------------------------------

/** Frete por CEP (POST /api/shipping) — Bearer opcional (Cliffhanger+). */
export function quoteShipping(
  token: string | null,
  payload: { cep: string; itemCount: number; subtotal: number },
): Promise<ShippingQuote> {
  return request<ShippingQuote>("/api/shipping", {
    method: "POST",
    body: payload,
    token: token ?? undefined,
  });
}

/** Valida cupom (POST /api/coupons/validate) — pública e somente leitura. */
export function validateCoupon(code: string, subtotal: number): Promise<CouponValidation> {
  return request<CouponValidation>("/api/coupons/validate", {
    method: "POST",
    body: { code, subtotal },
  });
}

/** Cria o pedido (POST /api/orders) — Bearer opcional (compra de visitante). */
export function createOrder(payload: CheckoutPayload, token?: string): Promise<OrderCreated> {
  return request<OrderCreated>("/api/orders", { method: "POST", body: payload, token });
}

/** Histórico de pedidos do cliente logado (GET /api/orders/mine). */
export function loadOrders(token: string): Promise<{ orders: Order[] }> {
  return request<{ orders: Order[] }>("/api/orders/mine", { token });
}

/** Endereços salvos da conta — pré-preenchimento do checkout (§7.2). */
export function loadSavedAddresses(token: string): Promise<{ addresses: SavedAddress[] }> {
  return request<{ addresses: SavedAddress[] }>("/api/account/addresses", { token });
}

// ---------------------------------------------------------------------------
// Avaliações (§19) — lista pública de aprovadas + envio autenticado
// ---------------------------------------------------------------------------

/** GET /api/reviews?productId= — só aprovadas, sem e-mail do autor. */
export function loadReviews(productId: string): Promise<{ items: PublicReview[] }> {
  return request<{ items: PublicReview[] }>(
    `/api/reviews?productId=${encodeURIComponent(productId)}`,
  );
}

/** POST /api/reviews — entra como pendente na moderação do painel. */
export function submitReview(token: string, review: ReviewInput): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/api/reviews", {
    method: "POST",
    token,
    body: { review },
  });
}

// ---------------------------------------------------------------------------
// Segurança da conta (Etapa C) — registry de sessões + exclusão total
// ---------------------------------------------------------------------------

export interface AccountSession {
  sid: string;
  device: string;
  /** IP mascrado no servidor (189.42.*.*) */
  ip: string;
  firstSeen: string;
  lastSeen: string;
}

/** Lista os dispositivos registrados (GET /api/account/sessions). */
export function loadSessions(token: string): Promise<{ sessions: AccountSession[] }> {
  return request<{ sessions: AccountSession[] }>("/api/account/sessions", { token });
}

/** Registra/atualiza a sessão deste dispositivo (POST — throttle 5 min). */
export function registerSession(
  token: string,
  payload: { sid: string; device: string },
): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/api/account/sessions", {
    method: "POST",
    body: payload,
    token,
  });
}

/** Sai só deste dispositivo (DELETE ?sid= — no logout). */
export function leaveSession(token: string, sid: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(
    `/api/account/sessions?sid=${encodeURIComponent(sid)}`,
    { method: "DELETE", token },
  );
}

/** Revoga os refresh tokens de todos os dispositivos (DELETE sem sid). */
export function revokeAllSessions(token: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/api/account/sessions", { method: "DELETE", token });
}

/** Exclusão completa da conta (Firestore + Auth + adminUsers). */
export function deleteAccount(token: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/api/account", { method: "DELETE", token });
}

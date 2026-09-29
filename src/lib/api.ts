/**
 * Cliente da API pública da Cliffhanger Store (mesmo backend do site).
 * Endpoints usados pelo app: /api/products (catálogo) e /api/library (sessão).
 */
import { STORE_URL } from "./firebase";
import type { Catalog, LibraryData } from "./types";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, token?: string): Promise<T> {
  if (!STORE_URL) {
    throw new ApiError("Loja não configurada (EXPO_PUBLIC_STORE_URL ausente no .env).");
  }
  let res: Response;
  try {
    res = await fetch(`${STORE_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
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
  return request<LibraryData>("/api/library", token);
}

/**
 * Banners da Home (Documento de Correção §5) — o app LÊ a MESMA coleção
 * `banners` do Firestore que o painel grava e o site renderiza (leitura pública
 * liberada nas regras do Firestore). Regras iguais às do site: ativo, janela de
 * agendamento (startsAt/endsAt) e ordenação por `order`; arte final única,
 * sem camadas montadas pelo app.
 */
import { collection, getDocs, getFirestore, limit, query } from "firebase/firestore";

import { getFirebaseApp, STORE_URL } from "./firebase";

export type BannerDestinationType =
  | "produto"
  | "obra"
  | "colecao"
  | "lancamento"
  | "campanha"
  | "pagina"
  | "externo";

/** Documento normalizado da coleção `banners` (espelha src/lib/types.ts da loja). */
export interface Banner {
  id: string;
  name: string;
  image: string;
  imageMobile?: string;
  alt?: string;
  destinationType: BannerDestinationType;
  destinationValue: string;
  order: number;
  active: boolean;
  startsAt?: string;
  endsAt?: string;
  fullscreen: boolean;
  showHeader: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Fallback oficial: arte padrão da loja (public/banner-valeharts-iii.jpg). */
export const DEFAULT_BANNER_IMAGE = `${STORE_URL}/banner-valeharts-iii.jpg`;

const DESTINATION_TYPES = new Set<BannerDestinationType>([
  "produto",
  "obra",
  "colecao",
  "lancamento",
  "campanha",
  "pagina",
  "externo",
]);

/** cache módulo — evita refazer a leitura a cada montagem de tela. */
let cached: Banner[] | null = null;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

/** Normaliza um doc (inclusive formato legado title/subtitle/link do site). */
function normalizeBanner(id: string, raw: Record<string, unknown>): Banner | null {
  const image = str(raw.image) || str(raw.imageMobile);
  if (!image) return null;

  const value =
    str(raw.destinationValue) ||
    // formato legado: `link` guarda o destino (href interno ou http).
    str(raw.link);
  const legacy = !DESTINATION_TYPES.has(raw.destinationType as BannerDestinationType);
  let destinationType = legacy ? "pagina" : (raw.destinationType as BannerDestinationType);
  const destinationValue = legacy
    ? /^https?:\/\//i.test(value)
      ? value
      : value || "/"
    : value;

  if (legacy && /^https?:\/\//i.test(destinationValue)) {
    destinationType = "externo";
  }

  return {
    id,
    name: str(raw.name) || str(raw.title) || "Banner",
    image,
    imageMobile: str(raw.imageMobile) || undefined,
    alt: str(raw.alt) || undefined,
    destinationType,
    destinationValue,
    order: num(raw.order, 0),
    active: raw.active !== false,
    startsAt: str(raw.startsAt) || undefined,
    endsAt: str(raw.endsAt) || undefined,
    fullscreen: raw.fullscreen === true,
    showHeader: raw.showHeader !== false,
    createdAt: str(raw.createdAt) || undefined,
    updatedAt: str(raw.updatedAt) || undefined,
  };
}

/**
 * Lê os banners publicados (somente os exibíveis) em ordem.
 * Falha em silêncio → [] (a home simplesmente fica sem hero).
 */
export async function loadBanners(): Promise<Banner[]> {
  if (cached) return cached;

  const app = getFirebaseApp();
  if (!app) return [];

  try {
    const db = getFirestore(app);
    const snap = await getDocs(query(collection(db, "banners"), limit(50)));
    const now = Date.now();

    const banners = snap.docs
      .map((doc) => normalizeBanner(doc.id, doc.data() as Record<string, unknown>))
      .filter((b): b is Banner => b !== null)
      .filter(
        (b) =>
          b.active &&
          (!b.startsAt || Date.parse(b.startsAt) <= now) &&
          (!b.endsAt || Date.parse(b.endsAt) >= now),
      )
      .sort((a, b) => a.order - b.order);

    cached = banners;
    return banners;
  } catch {
    return [];
  }
}

/** URL absoluta da arte (aceita caminho interno do Storage ou URL http). */
export function resolveBannerImage(banner: Banner, mobile = false): string {
  const raw = (mobile ? banner.imageMobile : undefined) ?? banner.image;
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${STORE_URL}${raw.startsWith("/") ? "" : "/"}${raw}`;
}

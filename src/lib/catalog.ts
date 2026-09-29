/**
 * Regras derivadas do catálogo — espelham src/lib/data.ts da loja para a
 * home do app (Documento Mestre §10.2) mostrar os mesmos critérios do site.
 */
import type { Author, Product, ProductCategory, Universe, Work } from "./types";

/** Mais vendidos (menor salesRank primeiro). */
export function bestSellers(products: Product[]): Product[] {
  return [...products]
    .filter((p) => typeof p.salesRank === "number")
    .sort((a, b) => (a.salesRank ?? 0) - (b.salesRank ?? 0));
}

/** Novidades: badges de lançamento ordenadas do mais recente. */
export function launches(products: Product[]): Product[] {
  return [...products]
    .filter((p) => p.badge === "LANÇAMENTO" || p.badge === "NOVO" || p.badge === "PRÉ-VENDA")
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

/** Recomendados: mais vendidos e, na falta, os melhor avaliados. */
export function recommended(products: Product[]): Product[] {
  const ranked = bestSellers(products);
  if (ranked.length > 0) return ranked;
  return [...products]
    .filter((p) => p.rating > 0)
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
}

/** Próximos lançamentos: data futura (ou pré-venda) em ordem cronológica. */
export function upcomingLaunches(products: Product[]): Product[] {
  const now = Date.now();
  return products
    .filter(
      (p) =>
        (p.releaseDate !== undefined && Date.parse(p.releaseDate) > now) ||
        p.badge === "PRÉ-VENDA",
    )
    .sort((a, b) => (a.releaseDate ?? "9999-12-31").localeCompare(b.releaseDate ?? "9999-12-31"));
}

/** Ofertas (comparativo maior que o preço). */
export function offers(products: Product[]): Product[] {
  return products.filter((p) => p.compareAt !== undefined && p.compareAt > p.price);
}

/** Busca textual em produtos (título, descrição, autor, obra, universo). */
export function searchProducts(
  products: Product[],
  authors: Author[],
  works: Work[],
  universes: Universe[],
  query: string,
): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const authorOf = new Map(authors.map((a) => [a.id, a.name.toLowerCase()]));
  const workOf = new Map(works.map((w) => [w.id, w.title.toLowerCase()]));
  const universeOf = new Map(universes.map((u) => [u.id, u.name.toLowerCase()]));
  return products.filter((p) => {
    const haystack = [
      p.title.toLowerCase(),
      p.description.toLowerCase(),
      p.slug.toLowerCase(),
      p.authorId ? (authorOf.get(p.authorId) ?? "") : "",
      p.workId ? (workOf.get(p.workId) ?? "") : "",
      p.universeId ? (universeOf.get(p.universeId) ?? "") : "",
    ].join(" ");
    return q.split(/\s+/).every((word) => haystack.includes(word));
  });
}

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  livros: "Livros",
  ebooks: "E-books",
  audiobooks: "Audiobooks",
  produtos: "Produtos",
  colecionaveis: "Colecionáveis",
};

/** Nome do autor do produto (quando vinculado). */
export function authorName(product: Product, authors: Author[]): string | null {
  const author = authors.find((a) => a.id === product.authorId);
  return author ? author.name : null;
}

/** Título da obra do produto (quando vinculado). */
export function workTitle(product: Product, works: Work[]): string | null {
  const work = works.find((w) => w.id === product.workId);
  return work ? work.title : null;
}

// ---------------------------------------------------------------------------
// Formatação
// ---------------------------------------------------------------------------

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(value: number): string {
  try {
    return brl.format(value);
  } catch {
    return `R$ ${value.toFixed(2).replace(".", ",")}`;
  }
}

/** dd/mm/aaaa a partir de ISO. */
export function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return null;
  const d = new Date(time);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

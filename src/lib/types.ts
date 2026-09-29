/**
 * Subconjunto do modelo de dados da Cliffhanger Store usado pelo app
 * (espelha src/lib/types.ts da loja — a API pública /api/products entrega
 * exatamente estes formatos).
 */

export type ProductCategory =
  | "livros"
  | "ebooks"
  | "audiobooks"
  | "produtos"
  | "colecionaveis";

export type ProductType =
  | "livro-fisico"
  | "hq"
  | "artbook"
  | "ebook"
  | "audiobook"
  | "camisa"
  | "caneca"
  | "poster"
  | "marcador"
  | "adesivo"
  | "print"
  | "box"
  | "colecionavel";

export type Badge =
  | "NOVO"
  | "LANÇAMENTO"
  | "PRÉ-VENDA"
  | "EXCLUSIVO"
  | "LIMITADO"
  | "BEST-SELLER"
  | "ESGOTANDO"
  | "OFERTA"
  | "DIGITAL"
  | "EDIÇÃO ESPECIAL";

export type CoverMotif = "farol" | "circuito" | "mare" | "sal" | "recorte";

export interface Cover {
  bg: string;
  fg: string;
  accent: string;
  motif: CoverMotif;
}

export interface Universe {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  cover: Cover;
  createdAt: string;
}

export interface Author {
  id: string;
  slug: string;
  name: string;
  role: string;
  bio: string;
  createdAt: string;
}

export interface Work {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  authorId: string;
  universeId: string;
  synopsis: string;
  year: number;
  seriesIndex?: number;
  seriesName?: string;
  cover: Cover;
  createdAt: string;
}

export interface Spec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  type: ProductType;
  category: ProductCategory;
  price: number;
  compareAt?: number;
  badge?: Badge;
  rating: number;
  reviewCount: number;
  stock: number;
  reserved?: number;
  minStock?: number;
  digital: boolean;
  workId?: string;
  universeId?: string;
  authorId?: string;
  description: string;
  specs: Spec[];
  cover?: Cover;
  /** ISO — usado em pré-vendas e lançamentos */
  releaseDate?: string;
  salesRank?: number;
  createdAt: string;
}

/** Item da biblioteca digital (e-book/audiobook possuído). */
export interface LibraryItem {
  id: string;
  productId: string;
  orderId?: string;
  title: string;
  slug?: string;
  type: "ebook" | "audiobook";
  image?: string;
  files: { kind: "pdf" | "audio"; url: string; name: string; allowDownload: boolean }[];
  purchasedAt: string;
  source?: "plus";
}

export interface ReadingProgress {
  productId: string;
  kind: "ebook" | "audiobook";
  page?: number;
  pages?: number;
  /** 0–100 */
  percent: number;
  position?: number;
  bookmarks: { id: string; label: string; page?: number; position?: number; createdAt: string }[];
  updatedAt: string;
}

/** Resposta de GET /api/products. */
export interface Catalog {
  products: Product[];
  works: Work[];
  universes: Universe[];
  authors: Author[];
}

/** Resposta de GET /api/library. */
export interface LibraryData {
  items: LibraryItem[];
  progress: Record<string, ReadingProgress>;
}

/** Item do carrinho local (mesmo formato do Store: { productId, qty }). */
export interface CartItem {
  productId: string;
  qty: number;
}

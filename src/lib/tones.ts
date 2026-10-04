/**
 * Tom dos selos por badge — espelha src/lib/tones.ts da loja para que o
 * card e a página de produto fiquem idênticos em qualquer superfície.
 */
export interface Tone {
  bg: string;
  fg: string;
}

export const BADGE_TONE: Record<string, Tone> = {
  NOVO: { bg: "#30a46c", fg: "#F8FEFF" },
  "LANÇAMENTO": { bg: "#A30707", fg: "#F8FEFF" },
  "PRÉ-VENDA": { bg: "#E7CB9B", fg: "#0E0000" },
  EXCLUSIVO: { bg: "#0E0000", fg: "#E7CB9B" },
  LIMITADO: { bg: "#e5484d", fg: "#F8FEFF" },
  "BEST-SELLER": { bg: "#E7CB9B", fg: "#0E0000" },
  ESGOTANDO: { bg: "#e5484d", fg: "#F8FEFF" },
  OFERTA: { bg: "#e5484d", fg: "#F8FEFF" },
  DIGITAL: { bg: "#A30707", fg: "#F8FEFF" },
  "EDIÇÃO ESPECIAL": { bg: "#0E0000", fg: "#E7CB9B" },
};

export const BADGE_FALLBACK: Tone = { bg: "#A30707", fg: "#F8FEFF" };

/** Tom de um selo (fallback vermelho da marca, como no site). */
export function badgeTone(badge?: string): Tone {
  return (badge && BADGE_TONE[badge]) || BADGE_FALLBACK;
}

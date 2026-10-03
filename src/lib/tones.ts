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
  "LANÇAMENTO": { bg: "#5603AD", fg: "#F8FEFF" },
  "PRÉ-VENDA": { bg: "#FDC500", fg: "#0C0014" },
  EXCLUSIVO: { bg: "#0C0014", fg: "#FDC500" },
  LIMITADO: { bg: "#e5484d", fg: "#F8FEFF" },
  "BEST-SELLER": { bg: "#FDC500", fg: "#0C0014" },
  ESGOTANDO: { bg: "#e5484d", fg: "#F8FEFF" },
  OFERTA: { bg: "#e5484d", fg: "#F8FEFF" },
  DIGITAL: { bg: "#5603AD", fg: "#F8FEFF" },
  "EDIÇÃO ESPECIAL": { bg: "#0C0014", fg: "#FDC500" },
};

export const BADGE_FALLBACK: Tone = { bg: "#5603AD", fg: "#F8FEFF" };

/** Tom de um selo (fallback violeta, como no site). */
export function badgeTone(badge?: string): Tone {
  return (badge && BADGE_TONE[badge]) || BADGE_FALLBACK;
}

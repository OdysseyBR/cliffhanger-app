/**
 * Tom dos selos por badge — espelha src/lib/tones.ts da loja para que o
 * card e a página de produto fiquem idênticos em qualquer superfície.
 *
 * Os tons da identidade (primário/destaque) são resolvidos a cada chamada
 * a partir de `Colors`, então acompanham a troca Preto e Branco ↔ Branco e
 * Preto (realces são inversões chapadas). Só os tons de status são fixos:
 * vermelho #E5484D (limitado/esgotando/oferta) e verde #30A46C (novo).
 */
import { Colors } from "@/constants/theme";

export interface Tone {
  bg: string;
  fg: string;
}

/** Tom de um selo (fallback = tom da marca, como no site). */
export function badgeTone(badge?: string): Tone {
  switch (badge) {
    case "NOVO":
      return { bg: "#30a46c", fg: "#ffffff" };
    case "LANÇAMENTO":
    case "DIGITAL":
      return { bg: Colors.primary, fg: Colors.onPrimary };
    case "PRÉ-VENDA":
    case "BEST-SELLER":
      return { bg: Colors.accent, fg: Colors.onAccent };
    case "EXCLUSIVO":
    case "EDIÇÃO ESPECIAL":
      return { bg: Colors.background, fg: Colors.accent };
    case "LIMITADO":
    case "ESGOTANDO":
    case "OFERTA":
      return { bg: "#e5484d", fg: "#ffffff" };
    default:
      // resolvido a cada chamada — `Colors` é mutado in-place pelo motor
      return { bg: Colors.primary, fg: Colors.onPrimary };
  }
}

/**
 * Tema oficial Cliffhanger — paleta vencedora da Etapa K (P4):
 * vermelho #A30707 + areia #E7CB9B sobre #0E0000 (escuro, padrão) e a
 * derivação clara (#FBF7F1 com areia escura #96743B p/ contraste).
 *
 * O app nasce escuro; sem "auto". A escolha fica em `cliffhanger:appearance`
 * (AsyncStorage, veja lib/useTheme.tsx). As cores vivas ficam no objeto
 * único `Colors`, mutado pelo motor — quem render lê no momento do render,
 * e os componentes inscritos via `useThemeColors()` re-renderizam ao trocar.
 */
import { useSyncExternalStore } from "react";

import "@/global.css";

export type ThemeMode = "dark" | "light";

/** Paleta-base (escuro) — mesma identidade do site. */
export const Palette = {
  /** fundo principal */
  bg: "#0E0000",
  /** cor primária (vermelho da marca) */
  primary: "#A30707",
  /** texto/foreground claro */
  fg: "#F8FEFF",
  /** destaque (areia) */
  accent: "#E7CB9B",
} as const;

/** Conjunto completo de cores — as mesmas chaves nos dois modos. */
export type ThemeColors = {
  /** fundo principal das telas */
  background: string;
  /** cartões e superfícies elevadas */
  surface: string;
  /** superfície alternada (inputs, steppers) */
  surfaceAlt: string;
  /** borda tingida por modo */
  border: string;
  /** linha sutil (divisores) */
  line: string;
  /** texto/foreground */
  text: string;
  /** texto secundário */
  textMuted: string;
  /** texto terciário */
  textFaint: string;
  /** vermelho da marca (CTAs) */
  primary: string;
  /** texto sobre o primário (papel) */
  onPrimary: string;
  /** destaque areia (ícones, ativos, links) */
  accent: string;
  /** texto sobre o destaque */
  onAccent: string;
  /** mensagens de erro/atenção */
  warning: string;
};

/** Modo escuro oficial — P4 (espelha o tema `theme-default` do site). */
const DARK: ThemeColors = {
  background: "#0E0000",
  surface: "#210303",
  surfaceAlt: "#300707",
  border: "#F8FEFF24", // rgba(248, 254, 255, .14)
  line: "#F8FEFF1A",
  text: "#F8FEFF",
  textMuted: "#D3B7A4",
  textFaint: "#F8FEFF66",
  primary: "#A30707",
  onPrimary: "#F8FEFF",
  accent: "#E7CB9B",
  onAccent: "#0E0000",
  warning: "#E7CB9B",
};

/** Modo claro oficial — P4 claro (espelha o tema `theme-claro` do site). */
const LIGHT: ThemeColors = {
  background: "#FBF7F1",
  surface: "#FFFFFF",
  surfaceAlt: "#F3E9DC",
  border: "#17030329", // rgba(23, 3, 3, .16)
  line: "#1703031A",
  text: "#170303",
  textMuted: "#6E5A51",
  textFaint: "#6E5A5199",
  primary: "#A30707",
  onPrimary: "#F8FEFF",
  accent: "#96743B",
  onAccent: "#F8FEFF",
  warning: "#7E0404",
};

/**
 * Cores vivas — objeto único mutado pelo motor (Object.assign). Todo o app
 * lê `Colors.x` no render; ao trocar o modo, os inscritos re-renderizam e
 * enxergam os novos valores na mesma batida.
 */
export const Colors: ThemeColors = { ...DARK };

/** Padrão escuro (sem "auto"): idêntico ao site para visitante novo. */
let mode: ThemeMode = "dark";
const listeners = new Set<() => void>();

export function getThemeMode(): ThemeMode {
  return mode;
}

/** Troca o modo, atualiza `Colors` e notifica os inscritos. */
export function setThemeMode(next: ThemeMode): void {
  if (next === mode) return;
  mode = next;
  Object.assign(Colors, next === "light" ? LIGHT : DARK);
  listeners.forEach((notify) => notify());
}

/** Assinatura p/ useSyncExternalStore (retorna o cleanup). */
export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Assina o motor de tema — chame no topo de CADA rota (tela/layout): telas
 * ficam montadas no navigator e não re-renderizam sozinhas quando o modo muda.
 */
export function useThemeColors(): void {
  useSyncExternalStore(subscribeTheme, getThemeMode, getThemeMode);
}

/** Famílias registradas em app/_layout.tsx via useFonts. */
export const Fonts = {
  display: "BebasNeue",
  body: "BarlowRegular",
  bodyMedium: "BarlowMedium",
  bodySemi: "BarlowSemiBold",
  bodyBold: "BarlowBold",
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/** Padding lateral padrão das telas. */
export const ScreenPadding = 16;

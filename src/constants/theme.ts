/**
 * Tema oficial Cliffhanger — paleta monocromática P&B (mesma identidade
 * da loja web): preto total #000000 + branco total #FFFFFF, com cinzas
 * neutros só para superfícies, divisores e texto secundário. O modo
 * escuro "Preto e Branco" é o padrão; o claro "Branco e Preto" inverte
 * as áreas escuras → claras.
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
  bg: "#000000",
  /** cor primária (branco total no modo escuro) */
  primary: "#FFFFFF",
  /** texto/foreground claro */
  fg: "#FFFFFF",
  /** destaque (mesmo polo do texto — realces são inversões chapadas) */
  accent: "#FFFFFF",
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
  /** cor primária (CTAs) */
  primary: string;
  /** texto sobre o primário (inversão chapada) */
  onPrimary: string;
  /** destaque (ícones, ativos, links — mesmo polo do primário) */
  accent: string;
  /** texto sobre o destaque */
  onAccent: string;
  /** mensagens de erro/atenção */
  warning: string;
};

/** Modo escuro oficial — "Preto e Branco" (espelha o tema `theme-default` do site). */
const DARK: ThemeColors = {
  background: "#000000",
  surface: "#141414",
  surfaceAlt: "#0d0d0d",
  border: "#FFFFFF24", // rgba(255, 255, 255, .14)
  line: "#FFFFFF1A",
  text: "#FFFFFF",
  textMuted: "#A3A3A3",
  textFaint: "#FFFFFF66",
  primary: "#FFFFFF",
  onPrimary: "#000000",
  accent: "#FFFFFF",
  onAccent: "#000000",
  warning: "#E5484D",
};

/** Modo claro oficial — "Branco e Preto" (espelha o tema `theme-claro` do site). */
const LIGHT: ThemeColors = {
  background: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceAlt: "#F2F2F2",
  border: "#00000029", // rgba(0, 0, 0, .16)
  line: "#0000001A",
  text: "#000000",
  textMuted: "#525252",
  textFaint: "#00000099",
  primary: "#000000",
  onPrimary: "#FFFFFF",
  accent: "#000000",
  onAccent: "#FFFFFF",
  warning: "#E5484D",
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

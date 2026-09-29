/**
 * Tema oficial Cliffhanger (paleta do projeto).
 * App escuro por padrão — identidade visual #0C0014 / #5603AD / #F8FEFF / #FDC500.
 */
import "@/global.css";

export const Palette = {
  /** fundo principal */
  bg: "#0C0014",
  /** cor primária (roxo) */
  primary: "#5603AD",
  /** texto/foreground claro */
  fg: "#F8FEFF",
  /** destaque (amarelo) */
  accent: "#FDC500",
} as const;

export const Colors = {
  background: Palette.bg,
  /** cartões e superfícies elevadas */
  surface: "#160324",
  /** superfície alternada (inputs, steppers) */
  surfaceAlt: "#1E0A33",
  /** borda tingida de roxo */
  border: "#5603AD66",
  /** linha sutil sobre fundo escuro */
  line: "#F8FEFF1A",
  text: Palette.fg,
  textMuted: "#F8FEFF9E",
  textFaint: "#F8FEFF66",
  primary: Palette.primary,
  accent: Palette.accent,
  /** texto sobre o destaque amarelo */
  onAccent: Palette.bg,
  /** mensagens de erro/atenção (destaque) */
  warning: Palette.accent,
} as const;

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

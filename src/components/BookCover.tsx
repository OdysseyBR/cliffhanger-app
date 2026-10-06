/**
 * Capa geométrica Cliffhanger em SVG — port do BookCover.tsx da loja web
 * (identidade de “recortes”, paleta oficial). Fundo chapado (regra P4
 * “sem gradientes”), sem id de gradiente.
 */
import Svg, {
  Circle,
  Path,
  Rect,
  Text as SvgText,
} from "react-native-svg";

import { Palette } from "@/constants/theme";
import type { Cover } from "@/lib/types";

export interface BookCoverProps {
  cover?: Cover;
  title?: string;
  label?: string;
}

export function BookCover({ cover, title, label }: BookCoverProps) {
  const {
    bg = Palette.primary,
    fg = Palette.fg,
    accent = Palette.accent,
    motif = "recorte",
  } = cover ?? {};

  const coverTitle = title ? title.toUpperCase() : null;
  const titleSize = coverTitle
    ? coverTitle.length > 18
      ? 24
      : coverTitle.length > 14
        ? 28
        : 34
    : 34;
  const shownTitle = coverTitle
    ? coverTitle.length > 24
      ? `${coverTitle.slice(0, 23)}…`
      : coverTitle
    : null;

  return (
    <Svg
      viewBox="0 0 300 450"
      preserveAspectRatio="xMidYMid slice"
      accessibilityLabel={title ?? "Capa"}
      width="100%"
      height="100%"
    >
      <Rect width="300" height="450" fill={bg} />

      {/* lombada */}
      <Rect x="0" y="0" width="14" height="450" fill={accent} opacity="0.85" />
      <Rect x="14" y="0" width="3" height="450" fill={fg} opacity="0.25" />

      {motif === "farol" && (
        <>
          <Path d="M150 120 L176 330 L124 330 Z" fill={fg} opacity="0.9" />
          <Rect x="138" y="96" width="24" height="26" fill={accent} />
          <Path d="M150 108 L30 60 L30 156 Z" fill={accent} opacity="0.35" />
          <Path d="M150 108 L270 60 L270 156 Z" fill={accent} opacity="0.35" />
          <Rect x="118" y="330" width="64" height="12" fill={fg} opacity="0.8" />
          <Path
            d="M40 372 q55 -26 110 0 t110 0"
            stroke={fg}
            strokeWidth="5"
            fill="none"
            opacity="0.5"
          />
          <Path
            d="M40 396 q55 -26 110 0 t110 0"
            stroke={accent}
            strokeWidth="5"
            fill="none"
            opacity="0.7"
          />
        </>
      )}

      {motif === "circuito" && (
        <>
          <Path
            d="M40 90 h80 v70 h60 v70 h-70 v80 h100"
            stroke={fg}
            strokeWidth="6"
            fill="none"
            opacity="0.75"
          />
          <Path d="M60 400 h70 v-60 h90 v-90 h50" stroke={accent} strokeWidth="6" fill="none" />
          <Circle cx="120" cy="90" r="9" fill={accent} />
          <Circle cx="180" cy="230" r="9" fill={fg} />
          <Circle cx="210" cy="340" r="9" fill={accent} />
          <Circle cx="130" cy="400" r="9" fill={fg} />
          <Rect x="196" y="150" width="70" height="46" fill={fg} opacity="0.35" />
        </>
      )}

      {motif === "mare" && (
        <>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <Path
              key={i}
              d={`M20 ${170 + i * 34} q40 -24 75 0 t75 0 t75 0`}
              stroke={i % 2 === 0 ? fg : accent}
              strokeWidth="7"
              fill="none"
              opacity={0.85 - i * 0.08}
            />
          ))}
          <Circle cx="215" cy="110" r="46" fill={accent} opacity="0.85" />
          <Rect x="40" y="86" width="96" height="64" fill={fg} opacity="0.55" />
        </>
      )}

      {motif === "sal" && (
        <>
          <Path d="M150 96 L214 168 L150 240 L86 168 Z" fill={fg} opacity="0.9" />
          <Path d="M150 140 L186 176 L150 212 L114 176 Z" fill={accent} />
          <Path d="M70 280 L120 330 L70 380 L20 330 Z" fill={accent} opacity="0.75" />
          <Path d="M232 300 L276 344 L232 388 L188 344 Z" fill={fg} opacity="0.7" />
          <Rect x="150" y="272" width="120" height="14" fill={fg} opacity="0.5" />
          <Rect x="150" y="300" width="84" height="14" fill={accent} opacity="0.7" />
        </>
      )}

      {motif === "recorte" && (
        <>
          <Circle cx="96" cy="140" r="66" fill={accent} opacity="0.9" />
          <Path d="M170 74 L266 160 L170 246 Z" fill={fg} opacity="0.85" />
          <Rect x="48" y="250" width="130" height="90" fill={fg} opacity="0.5" />
          <Path d="M196 268 h74 v74 h-74 Z" fill={accent} opacity="0.8" />
          <Path d="M60 372 h190 v18 H60 Z" fill={fg} opacity="0.6" />
          <Path d="M32 60 h60 v10 H32 Z" fill={fg} opacity="0.7" />
        </>
      )}

      {shownTitle && (
        <SvgText
          x="34"
          y="404"
          fill={fg}
          fontSize={titleSize}
          letterSpacing={1}
          fontWeight="bold"
        >
          {shownTitle}
        </SvgText>
      )}
      {label && (
        <SvgText x="34" y="428" fill={accent} fontSize="15" fontWeight="bold" letterSpacing={3}>
          {label.toUpperCase()}
        </SvgText>
      )}
    </Svg>
  );
}

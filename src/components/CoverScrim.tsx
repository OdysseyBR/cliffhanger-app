/**
 * Scrim da capa — gradiente #0E0000 → transparente para selo e preço
 * respirarem sobre a arte (mesmo efeito do site; escuro fixo por cima
 * da arte, nos dois modos).
 */
import { useId } from "react";
import { View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

export function CoverScrim({ height = 104 }: { height?: number }) {
  const id = `s-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <View
      style={{ pointerEvents: "none", position: "absolute", left: 0, right: 0, bottom: 0, height }}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor="#0E0000" stopOpacity="1" />
            <Stop offset="0.55" stopColor="#0E0000" stopOpacity="0.55" />
            <Stop offset="1" stopColor="#0E0000" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect width="100" height={height} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

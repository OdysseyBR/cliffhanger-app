/**
 * Barra de progresso (biblioteca: leitura/escuta — §10.2 "Continue...").
 */
import { View } from "react-native";

import { Colors } from "@/constants/theme";

export function ProgressBar({ percent }: { percent: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <View
      style={{
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.surfaceAlt,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${pct}%`,
          height: "100%",
          borderRadius: 3,
          backgroundColor: Colors.accent,
        }}
      />
    </View>
  );
}

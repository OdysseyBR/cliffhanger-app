/**
 * Estrelas da identidade — espelha Stars.tsx da loja: nota arredondada
 * (cheias douradas, vazias a 35% de opacidade) + nota formatada e contagem.
 */
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { Colors, Fonts } from "@/constants/theme";

interface StarsProps {
  rating: number;
  /** mostra " (n)" ao lado da nota quando informada */
  count?: number;
  size?: number;
  /** cor da nota/contagem (padrão: texto suave) */
  tone?: "muted" | "accent";
}

export function Stars({ rating, count, size = 13, tone = "muted" }: StarsProps) {
  const full = Math.round(rating);
  const color = tone === "accent" ? Colors.accent : Colors.textMuted;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ flexDirection: "row", gap: 1 }} accessibilityLabel={`Avaliação ${rating} de 5`}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Ionicons
            key={i}
            name={i < full ? "star" : "star-outline"}
            size={size}
            color={Colors.accent}
            style={{ opacity: i < full ? 1 : 0.35 }}
          />
        ))}
      </View>
      <Text
        style={{
          fontFamily: Fonts.bodySemi,
          fontSize: size - 1,
          color,
        }}
      >
        {rating > 0 ? rating.toFixed(1).replace(".", ",") : "—"}
        {typeof count === "number" ? (
          <Text style={{ fontFamily: Fonts.body, color: Colors.textFaint }}> ({count})</Text>
        ) : null}
      </Text>
    </View>
  );
}

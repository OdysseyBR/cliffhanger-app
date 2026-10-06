/**
 * Scrim da capa — tinta chapada #0E0000/70% na base para selo e preço
 * respirarem sobre a arte. Mesmo padrão aprovado no site (Etapa P:
 * "bg-ink/70" sem gradiente, regra P4 do chapado), escuro fixo por cima
 * da arte, nos dois modos.
 */
import { View } from "react-native";

export function CoverScrim({ height = 104 }: { height?: number }) {
  return (
    <View
      style={{
        pointerEvents: "none",
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height,
        backgroundColor: "rgba(14, 0, 0, 0.7)",
      }}
    />
  );
}

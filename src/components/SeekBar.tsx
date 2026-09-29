/**
 * Barra de posição do player (nativo + web) — responder system direto na
 * View, sem módulo nativo extra (@react-native-community/slider não
 * renderiza no web, e o app precisa funcionar nas capturas web).
 */
import { useState } from "react";
import { View } from "react-native";

import { Colors } from "@/constants/theme";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function SeekBar({
  position,
  duration,
  onSeek,
}: {
  /** posição atual em segundos */
  position: number;
  /** duração total em segundos (0 = ainda não carregou) */
  duration: number;
  /** chamado ao soltar o dedo com a posição alvo em segundos */
  onSeek: (seconds: number) => void;
}) {
  /** largura do trilho (px) — medida no onLayout */
  const [trackWidth, setTrackWidth] = useState(1);
  /** razão 0..1 enquanto arrasta; null = seguindo a reprodução */
  const [drag, setDrag] = useState<number | null>(null);

  const ratio = drag ?? (duration > 0 ? clamp(position / duration, 0, 1) : 0);
  const ratioAt = (x: number) => clamp(x / Math.max(trackWidth, 1), 0, 1);

  return (
    <View
      style={{
        height: 44,
        justifyContent: "center",
        opacity: duration > 0 ? 1 : 0.4,
      }}
      onLayout={(event) => setTrackWidth(Math.max(event.nativeEvent.layout.width, 1))}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(event) => setDrag(ratioAt(event.nativeEvent.locationX))}
      onResponderMove={(event) => setDrag(ratioAt(event.nativeEvent.locationX))}
      onResponderRelease={(event) => {
        const target = ratioAt(event.nativeEvent.locationX);
        setDrag(null);
        if (duration > 0) onSeek(target * duration);
      }}
      onResponderTerminate={() => setDrag(null)}
    >
      <View
        style={{
          pointerEvents: "none",
          height: 4,
          borderRadius: 2,
          backgroundColor: Colors.line,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${ratio * 100}%`,
            backgroundColor: Colors.accent,
            borderRadius: 2,
          }}
        />
      </View>
      <View
        style={{
          pointerEvents: "none",
          position: "absolute",
          left: `${ratio * 100}%`,
          marginLeft: -7,
          width: 14,
          height: 14,
          borderRadius: 7,
          backgroundColor: Colors.accent,
          borderWidth: 2,
          borderColor: Colors.background,
        }}
      />
    </View>
  );
}

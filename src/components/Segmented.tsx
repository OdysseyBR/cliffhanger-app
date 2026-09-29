/**
 * Seletor segmentado (Entrar / Criar conta).
 */
import { Pressable, Text, View } from "react-native";

import { Colors, Fonts, Radius } from "@/constants/theme";

interface SegmentedProps<T extends string> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: Colors.surface,
        borderRadius: Radius.pill,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: 4,
        gap: 4,
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              {
                flex: 1,
                paddingVertical: 10,
                borderRadius: Radius.pill,
                alignItems: "center",
                backgroundColor: active ? Colors.accent : "transparent",
                opacity: pressed && !active ? 0.7 : 1,
              },
            ]}
          >
            <Text
              style={{
                fontFamily: Fonts.bodySemi,
                fontSize: 14,
                letterSpacing: 0.4,
                color: active ? Colors.onAccent : Colors.textMuted,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Botão da identidade (primário = destaque amarelo; secundário = contorno roxo).
 */
import { ActivityIndicator, Pressable, Text, type StyleProp, type ViewStyle } from "react-native";

import { Colors, Fonts, Radius } from "@/constants/theme";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const primary = variant === "primary";
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          minHeight: 48,
          borderRadius: Radius.md,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingHorizontal: 20,
          backgroundColor: primary ? Colors.accent : "transparent",
          borderWidth: primary ? 0 : 1,
          borderColor: Colors.primary,
          opacity: inactive ? 0.55 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={primary ? Colors.onAccent : Colors.accent} />
      ) : null}
      <Text
        style={{
          fontFamily: Fonts.bodyBold,
          fontSize: 15,
          letterSpacing: 0.8,
          color: primary ? Colors.onAccent : Colors.text,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

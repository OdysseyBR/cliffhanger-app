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
  /** brilho amarelo no botão primário (CTAs de conversão) */
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  glow = false,
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
          minHeight: 50,
          borderRadius: Radius.md,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingHorizontal: 20,
          backgroundColor: primary ? Colors.accent : Colors.surface,
          borderWidth: primary ? 0 : 1,
          borderColor: primary ? Colors.accent : Colors.primary,
          opacity: inactive ? 0.55 : pressed ? 0.85 : 1,
          ...(primary && glow && !inactive
            ? {
                shadowColor: Colors.accent,
                shadowOpacity: 0.45,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: 6,
              }
            : null),
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

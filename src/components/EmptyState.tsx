/**
 * Estado vazio/erro com ícone monocrômico, mensagem e ação opcional
 * (critério de conclusão: estados vazios/erro tratados).
 */
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { Colors, Fonts, Radius } from "@/constants/theme";

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** reduz a altura (uso dentro de trilhos) */
  compact?: boolean;
}

export function EmptyState({
  icon = "sparkles-outline",
  title,
  message,
  actionLabel,
  onAction,
  compact = false,
}: EmptyStateProps) {
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: compact ? 20 : 40,
        paddingHorizontal: 24,
      }}
    >
      <Ionicons name={icon} size={compact ? 28 : 40} color={Colors.textFaint} />
      <Text
        style={{
          fontFamily: Fonts.bodySemi,
          fontSize: compact ? 13 : 15,
          color: Colors.text,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      {message ? (
        <Text
          style={{
            fontFamily: Fonts.body,
            fontSize: 13,
            lineHeight: 18,
            color: Colors.textMuted,
            textAlign: "center",
            maxWidth: 300,
          }}
        >
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            {
              marginTop: 8,
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: Radius.pill,
              borderWidth: 1,
              borderColor: Colors.accent,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text
            style={{
              fontFamily: Fonts.bodyBold,
              fontSize: 13,
              letterSpacing: 0.6,
              color: Colors.accent,
            }}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Estado vazio/erro: badge circular com ícone monocrômico, mensagem e ação
 * opcional (critério de conclusão: estados vazios/erro tratados).
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
      <View
        style={{
          width: compact ? 56 : 72,
          height: compact ? 56 : 72,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: Colors.surface,
          borderWidth: 1,
          borderColor: Colors.border,
          marginBottom: 4,
        }}
      >
        <Ionicons name={icon} size={compact ? 24 : 32} color={Colors.accent} />
      </View>
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
          accessibilityRole="button"
          style={({ pressed }) => [
            {
              marginTop: 8,
              paddingHorizontal: 22,
              paddingVertical: 11,
              borderRadius: Radius.pill,
              backgroundColor: Colors.accent,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text
            style={{
              fontFamily: Fonts.bodyBold,
              fontSize: 13,
              letterSpacing: 0.6,
              color: Colors.onAccent,
            }}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

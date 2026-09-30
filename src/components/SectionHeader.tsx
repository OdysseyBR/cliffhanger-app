/**
 * Título de seção editorial: barra de destaque + display Bebas + ação à
 * direita (mesmo padrão das seções do site).
 */
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, Text, View } from "react-native";

import { Colors, Fonts, ScreenPadding } from "@/constants/theme";

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({ title, actionLabel, onAction, style }: SectionHeaderProps) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          paddingHorizontal: ScreenPadding,
          marginBottom: 12,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
        <View
          style={{
            width: 4,
            height: 18,
            borderRadius: 2,
            backgroundColor: Colors.accent,
          }}
        />
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontFamily: Fonts.display,
            fontSize: 22,
            letterSpacing: 1.2,
            color: Colors.text,
          }}
        >
          {title.toUpperCase()}
        </Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          {({ pressed }) => (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 2,
                opacity: pressed ? 0.6 : 1,
              }}
            >
              <Text
                style={{
                  fontFamily: Fonts.bodySemi,
                  fontSize: 12,
                  color: Colors.accent,
                  letterSpacing: 0.6,
                }}
              >
                {actionLabel}
              </Text>
              <Text
                style={{
                  fontFamily: Fonts.bodyBold,
                  fontSize: 13,
                  color: Colors.accent,
                }}
              >
                ›
              </Text>
            </View>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

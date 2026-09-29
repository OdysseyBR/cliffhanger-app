/**
 * Trilho horizontal de seção (home do app §10.2): título + itens roláveis.
 */
import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Colors, Fonts, ScreenPadding } from "@/constants/theme";

interface RailProps {
  title: string;
  children: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function Rail({ title, children, actionLabel, onAction }: RailProps) {
  return (
    <View style={{ marginBottom: 24 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          paddingHorizontal: ScreenPadding,
          marginBottom: 12,
        }}
      >
        <Text
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
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} hitSlop={8}>
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
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: 12,
          paddingHorizontal: ScreenPadding,
        }}
      >
        {children}
      </ScrollView>
    </View>
  );
}

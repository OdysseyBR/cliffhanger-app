/**
 * Trilho horizontal de seção (home do app §10.2): SectionHeader + itens
 * roláveis.
 */
import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";

import { SectionHeader } from "@/components/SectionHeader";
import { ScreenPadding } from "@/constants/theme";

interface RailProps {
  title: string;
  children: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function Rail({ title, children, actionLabel, onAction }: RailProps) {
  return (
    <View style={{ marginBottom: 24 }}>
      <SectionHeader title={title} actionLabel={actionLabel} onAction={onAction} />
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

/**
 * Moldura das telas: header fixo (AppHeader — marca + carrinho no topo,
 * Doc Mestre §10.1) com área de conteúdo rolável. Com `title`, vira header
 * de subpágina com volta.
 */
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { AppHeader } from "@/components/AppHeader";
import { Colors, Fonts } from "@/constants/theme";

interface ScreenProps {
  children: ReactNode;
  /** título da subpágina — mostra botão de volta no lugar da marca */
  title?: string;
  /** esconde o header no topo (ex.: tela de login) */
  hideHeader?: boolean;
  scroll?: boolean;
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  title,
  hideHeader,
  scroll = true,
  onRefresh,
  refreshing = false,
  contentStyle,
}: ScreenProps) {
  const header = <AppHeader title={title} hidden={hideHeader} />;

  if (!scroll) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        {header}
        <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {header}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[{ paddingBottom: 32 }, contentStyle]}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accent}
              colors={[Colors.accent]}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </View>
  );
}

/** Indicador de carregamento centralizado (estados de carga das telas). */
export function Loading({ label }: { label?: string }) {
  return (
    <View
      style={{
        flex: 1,
        minHeight: 240,
        backgroundColor: Colors.background,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 24,
      }}
    >
      <ActivityIndicator color={Colors.accent} size="large" />
      {label ? (
        <Text style={{ fontFamily: Fonts.body, fontSize: 14, color: Colors.textMuted }}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

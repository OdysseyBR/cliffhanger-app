/**
 * Moldura das telas: header fixo (marca + carrinho no topo — Doc Mestre §10.1)
 * com área de conteúdo rolável. Com `title`, vira header de subpágina com volta.
 */
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, Fonts, ScreenPadding } from "@/constants/theme";
import { useCart } from "@/lib/useCart";

interface ScreenProps {
  children: ReactNode;
  /** título da subpágina — mostra botão de volta no lugar da marca */
  title?: string;
  scroll?: boolean;
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  title,
  scroll = true,
  onRefresh,
  refreshing = false,
  contentStyle,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { count } = useCart();

  const header = (
    <View
      style={{
        paddingTop: insets.top + 6,
        paddingBottom: 10,
        paddingHorizontal: ScreenPadding,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        backgroundColor: Colors.background,
      }}
    >
      {title !== undefined ? (
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Voltar"
          hitSlop={8}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, marginRight: 2 }]}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
      ) : null}

      {title !== undefined ? (
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
      ) : (
        <Text
          style={{
            flex: 1,
            fontFamily: Fonts.display,
            fontSize: 24,
            letterSpacing: 1.5,
            color: Colors.text,
          }}
        >
          CLIFFHANGER <Text style={{ color: Colors.accent }}>STORE</Text>
        </Text>
      )}

      <Pressable
        onPress={() => router.push("/cart")}
        accessibilityLabel="Carrinho"
        hitSlop={8}
        style={({ pressed }) => [
          {
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: Colors.border,
            backgroundColor: Colors.surface,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Ionicons name="cart" size={20} color={Colors.text} />
        {count > 0 && (
          <View
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              paddingHorizontal: 3,
              backgroundColor: Colors.accent,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontFamily: Fonts.bodyBold,
                fontSize: 10,
                color: Colors.onAccent,
              }}
            >
              {count > 99 ? "99+" : count}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );

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

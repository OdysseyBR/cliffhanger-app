/**
 * Cabeçalho do app (Doc Mestre §10.1): wordmark oficial + carrinho no topo.
 * Com `title`, vira header de subpágina (volta + título display).
 */
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Wordmark } from "@/components/Wordmark";
import { Colors, Fonts, ScreenPadding } from "@/constants/theme";
import { useCart } from "@/lib/useCart";

interface AppHeaderProps {
  /** título da subpágina — mostra botão de volta no lugar do wordmark */
  title?: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const { count } = useCart();

  return (
    <View
      style={{
        paddingTop: insets.top + 6,
        paddingBottom: 10,
        paddingHorizontal: ScreenPadding,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.line,
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
      ) : (
        /* espaçador simétrico ao carrinho — mantém o wordmark centralizado */
        <View style={{ width: 42 }} />
      )}

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
        <View style={{ flex: 1, alignItems: "center" }}>
          <Wordmark height={26} />
        </View>
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
}

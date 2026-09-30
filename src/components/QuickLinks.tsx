/**
 * Atalhos da Home — grade de categorias (loja já filtrada via params) + atalhos
 * de Buscar/Biblioteca, no mesmo espírito do grid de atalhos do site.
 */
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { type ComponentProps } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";

import { Colors, Fonts, Radius, ScreenPadding } from "@/constants/theme";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

const TILES: { label: string; icon: IoniconName; onPress: () => void }[] = [
  { label: "Loja", icon: "storefront-outline", onPress: () => router.push("/shop") },
  {
    label: "Livros",
    icon: "book-outline",
    onPress: () => router.push({ pathname: "/shop", params: { filter: "livros" } }),
  },
  {
    label: "E-books",
    icon: "tablet-portrait-outline",
    onPress: () => router.push({ pathname: "/shop", params: { filter: "ebooks" } }),
  },
  {
    label: "Audiobooks",
    icon: "headset-outline",
    onPress: () => router.push({ pathname: "/shop", params: { filter: "audiobooks" } }),
  },
  {
    label: "Produtos",
    icon: "shirt-outline",
    onPress: () => router.push({ pathname: "/shop", params: { filter: "produtos" } }),
  },
  {
    label: "Colecionáveis",
    icon: "cube-outline",
    onPress: () => router.push({ pathname: "/shop", params: { filter: "colecionaveis" } }),
  },
  { label: "Buscar", icon: "search-outline", onPress: () => router.push("/search") },
  { label: "Biblioteca", icon: "library-outline", onPress: () => router.push("/library") },
];

const GAP = 8;
const COLUMNS = 4;

export function QuickLinks() {
  const { width } = useWindowDimensions();
  const available = Math.min(width, 840) - ScreenPadding * 2;
  const tileWidth = (available - GAP * (COLUMNS - 1)) / COLUMNS;

  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: GAP,
        paddingHorizontal: ScreenPadding,
        marginBottom: 24,
      }}
    >
      {TILES.map((tile) => (
        <Pressable
          key={tile.label}
          onPress={tile.onPress}
          accessibilityRole="button"
          accessibilityLabel={tile.label}
          style={({ pressed }) => [
            {
              width: tileWidth,
              height: 78,
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              borderRadius: Radius.md,
              borderWidth: 1,
              borderColor: pressed ? Colors.border : Colors.line,
              backgroundColor: Colors.surface,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons name={tile.icon} size={22} color={Colors.accent} />
          <Text
            numberOfLines={1}
            style={{
              fontFamily: Fonts.bodyMedium,
              fontSize: 10.5,
              color: Colors.textMuted,
              textAlign: "center",
            }}
          >
            {tile.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

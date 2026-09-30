/**
 * Card de produto (anatomia do site): capa2:3 com selo + coração de wishlist,
 * tipo em micro-caixa alta, título, estrelas e preço com compareAt riscado.
 * Vai para /product/[id] (loja/buscar/home).
 */
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { BookCover } from "@/components/BookCover";
import { Colors, Fonts, Radius } from "@/constants/theme";
import { formatBRL } from "@/lib/catalog";
import type { Product, ProductType } from "@/lib/types";
import { useAuth } from "@/lib/useAuth";

/** Rótulos de tipo — espelham typeLabels do site. */
const TYPE_LABELS: Record<ProductType, string> = {
  "livro-fisico": "Livro físico",
  hq: "HQ",
  artbook: "Artbook",
  ebook: "E-book",
  audiobook: "Audiobook",
  camisa: "Camiseta",
  caneca: "Caneca",
  poster: "Pôster",
  marcador: "Marcador",
  adesivo: "Adesivos",
  print: "Print",
  box: "Box",
  colecionavel: "Colecionável",
};

interface ProductCardProps {
  product: Product;
  /** largura fixa (trilhos); na grade use `fill` */
  width?: number;
  fill?: boolean;
  /** texto auxiliar (ex.: data de lançamento) */
  subtitle?: string;
  /** 0 = não mostrar avaliação */
  rating?: boolean;
}

export function ProductCard({ product, width, fill, subtitle, rating }: ProductCardProps) {
  const esgotado = product.stock <= 0;
  const { wishlist, toggleWishlist } = useAuth();
  const wished = wishlist.includes(product.id);

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: "/product/[id]", params: { id: product.id } })
      }
      style={({ pressed }) => [
        {
          width: fill ? "47%" : width ?? 140,
          flexDirection: "column",
          borderRadius: Radius.md,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: pressed ? Colors.border : Colors.line,
          backgroundColor: Colors.surface,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
      accessibilityLabel={product.title}
    >
      <View
        style={{
          aspectRatio: 2 / 3,
          backgroundColor: Colors.surfaceAlt,
        }}
      >
        <BookCover cover={product.cover} title={product.title} />
        {product.badge ? (
          <View
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              backgroundColor: Colors.accent,
              borderRadius: Radius.pill,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <Text
              style={{
                fontFamily: Fonts.bodyBold,
                fontSize: 9,
                letterSpacing: 0.8,
                color: Colors.onAccent,
              }}
            >
              {product.badge}
            </Text>
          </View>
        ) : null}
        <Pressable
          onPress={() => {
            void toggleWishlist(product.id);
          }}
          accessibilityRole="button"
          accessibilityLabel={wished ? "Remover da wishlist" : "Salvar na wishlist"}
          hitSlop={6}
          style={({ pressed }) => [
            {
              position: "absolute",
              top: 8,
              right: 8,
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: Colors.line,
              backgroundColor: "#0C0014CC",
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons
            name={wished ? "heart" : "heart-outline"}
            size={17}
            color={wished ? "#E5484D" : Colors.textMuted}
          />
        </Pressable>
        {esgotado ? (
          <View
            style={{
              position: "absolute",
              bottom: 8,
              right: 8,
              backgroundColor: "#0C0014E6",
              borderRadius: Radius.sm,
              paddingHorizontal: 6,
              paddingVertical: 3,
            }}
          >
            <Text
              style={{
                fontFamily: Fonts.bodySemi,
                fontSize: 9,
                letterSpacing: 0.8,
                color: Colors.textMuted,
              }}
            >
              ESGOTADO
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ flex: 1, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10, gap: 4 }}>
        <Text
          style={{
            fontFamily: Fonts.bodyBold,
            fontSize: 9.5,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            color: Colors.accent,
          }}
        >
          {TYPE_LABELS[product.type] ?? product.type}
          {product.digital ? " · digital" : ""}
        </Text>

        <Text
          numberOfLines={2}
          style={{
            fontFamily: Fonts.bodySemi,
            fontSize: 13,
            lineHeight: 17,
            color: Colors.text,
          }}
        >
          {product.title}
        </Text>

        {subtitle ? (
          <Text
            numberOfLines={1}
            style={{
              fontFamily: Fonts.bodyMedium,
              fontSize: 11,
              letterSpacing: 0.6,
              color: Colors.textMuted,
            }}
          >
            {subtitle}
          </Text>
        ) : null}

        {rating && product.reviewCount > 0 ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="star" size={11} color={Colors.accent} />
            <Text style={{ fontFamily: Fonts.bodyMedium, fontSize: 11, color: Colors.textMuted }}>
              {product.rating.toFixed(1)} ({product.reviewCount})
            </Text>
          </View>
        ) : null}

        <View style={{ marginTop: "auto", paddingTop: 4 }}>
          {product.compareAt !== undefined && product.compareAt > product.price ? (
            <Text
              style={{
                fontFamily: Fonts.body,
                fontSize: 11,
                color: Colors.textFaint,
                textDecorationLine: "line-through",
              }}
            >
              {formatBRL(product.compareAt)}
            </Text>
          ) : null}
          <Text
            style={{
              fontFamily: Fonts.display,
              fontSize: 19,
              letterSpacing: 0.6,
              color: Colors.accent,
            }}
          >
            {formatBRL(product.price)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

/**
 * Card de produto: capa + selo + preço. Vai para /product/[id] (loja/buscar/home).
 */
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { BookCover } from "@/components/BookCover";
import { Colors, Fonts, Radius } from "@/constants/theme";
import { formatBRL } from "@/lib/catalog";
import type { Product } from "@/lib/types";

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

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: "/product/[id]", params: { id: product.id } })
      }
      style={({ pressed }) => [
        {
          width: fill ? "47%" : width ?? 140,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      accessibilityLabel={product.title}
    >
      <View
        style={{
          aspectRatio: 2 / 3,
          borderRadius: Radius.sm,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: Colors.line,
          backgroundColor: Colors.surface,
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
              borderRadius: Radius.sm,
              paddingHorizontal: 6,
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

      <Text
        numberOfLines={2}
        style={{
          marginTop: 8,
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
            marginTop: 2,
            fontFamily: Fonts.bodyMedium,
            fontSize: 11,
            letterSpacing: 0.6,
            color: Colors.accent,
          }}
        >
          {subtitle}
        </Text>
      ) : null}

      {rating && product.reviewCount > 0 ? (
        <Text
          style={{
            marginTop: 2,
            fontFamily: Fonts.body,
            fontSize: 11,
            color: Colors.textFaint,
          }}
        >
          ★ {product.rating.toFixed(1)} ({product.reviewCount})
        </Text>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 4 }}>
        <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.accent }}>
          {formatBRL(product.price)}
        </Text>
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
      </View>
    </Pressable>
  );
}

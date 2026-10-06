/**
 * Card de produto (anatomia do site, Doc Mestre §7): capa 2:3 com scrim +
 * brilho, selo e desconto sobre a arte, coração de wishlist, tipo em
 * micro-caixa alta, título display, estrelas, preço "de/por", alerta de
 * estoque e botão Comprar. Vai para /product/[id] (loja/buscar/home).
 */
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { memo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { CoverScrim } from "@/components/CoverScrim";
import { ProductArt } from "@/components/ProductArt";
import { Stars } from "@/components/Stars";
import { Colors, Fonts, Radius } from "@/constants/theme";
import { discountPercent, formatBRL, TYPE_LABELS } from "@/lib/catalog";
import { badgeTone } from "@/lib/tones";
import type { Product } from "@/lib/types";
import { useAuth } from "@/lib/useAuth";
import { useCart } from "@/lib/useCart";

interface ProductCardProps {
  product: Product;
  /** largura fixa (trilhos); na grade use `width` calculado */
  width?: number;
  /** ocupa a coluna (grade de 2 colunas) */
  fill?: boolean;
  /** texto auxiliar (ex.: data de lançamento) */
  subtitle?: string;
  /** false esconde as estrelas (padrão: mostra) */
  rating?: boolean;
}

function ProductCardImpl({ product, width, fill, subtitle, rating = true }: ProductCardProps) {
  const soldOut = product.stock === 0 && !product.digital;
  const lowStock = !product.digital && product.stock > 0 && product.stock <= 5;
  const off = discountPercent(product.price, product.compareAt);
  const { wishlist, toggleWishlist } = useAuth();
  const { add } = useCart();
  const wished = wishlist.includes(product.id);
  const [added, setAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tone = badgeTone(product.badge);

  const onAdd = () => {
    add(product.id);
    setAdded(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAdded(false), 1600);
  };

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: "/product/[id]", params: { id: product.id } })
      }
      style={({ pressed }) => [
        {
          width: fill ? "48%" : width ?? 140,
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
      <View style={{ aspectRatio: 2 / 3, backgroundColor: Colors.surfaceAlt }}>
        <ProductArt product={product} />
        <CoverScrim />

        <View style={{ position: "absolute", top: 8, left: 8, flexDirection: "column", gap: 6 }}>
          {product.badge ? (
            <View
              style={{
                backgroundColor: tone.bg,
                borderRadius: Radius.pill,
                paddingHorizontal: 8,
                paddingVertical: 3,
                alignSelf: "flex-start",
              }}
            >
              <Text
                style={{
                  fontFamily: Fonts.bodyBold,
                  fontSize: 9,
                  letterSpacing: 0.8,
                  color: tone.fg,
                }}
              >
                {product.badge}
              </Text>
            </View>
          ) : null}
          {off && !soldOut ? (
            <View
              style={{
                backgroundColor: Colors.accent,
                borderRadius: Radius.pill,
                paddingHorizontal: 8,
                paddingVertical: 3,
                alignSelf: "flex-start",
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
                −{off}%
              </Text>
            </View>
          ) : null}
        </View>

        <Pressable
          onPress={() => {
            void toggleWishlist(product.id);
          }}
          accessibilityRole="button"
          accessibilityLabel={wished ? "Remover da wishlist" : "Salvar na wishlist"}
          hitSlop={8}
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
              backgroundColor: "#0E0000CC",
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons
            name={wished ? "heart" : "heart-outline"}
            size={17}
            color={wished ? "#e5484d" : Colors.textMuted}
          />
        </Pressable>

        {soldOut ? (
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "#e5484d",
              paddingVertical: 5,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: Fonts.bodyBold,
                fontSize: 9,
                letterSpacing: 1.8,
                color: "#F8FEFF",
              }}
            >
              ESGOTADO
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ flex: 1, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10, gap: 4 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
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
          </Text>
          {product.digital ? (
            <Text
              style={{
                fontFamily: Fonts.bodyMedium,
                fontSize: 9.5,
                letterSpacing: 0.8,
                textTransform: "uppercase",
                color: Colors.textMuted,
              }}
            >
              · digital
            </Text>
          ) : null}
        </View>

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

        {rating ? <Stars rating={product.rating} count={product.reviewCount} size={12} /> : null}

        <View style={{ marginTop: "auto", paddingTop: 6, gap: 6 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", gap: 6 }}>
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
            {off ? (
              <Text
                style={{
                  fontFamily: Fonts.body,
                  fontSize: 11,
                  color: Colors.textFaint,
                  textDecorationLine: "line-through",
                }}
              >
                {formatBRL(product.compareAt!)}
              </Text>
            ) : null}
          </View>

          {lowStock ? (
            <Text
              style={{
                fontFamily: Fonts.bodyBold,
                fontSize: 9.5,
                letterSpacing: 0.8,
                textTransform: "uppercase",
                color: "#e5484d",
              }}
            >
              Restam apenas {product.stock}
            </Text>
          ) : null}

          <Pressable
            onPress={onAdd}
            disabled={soldOut}
            accessibilityRole="button"
            hitSlop={6}
            style={({ pressed }) => [
              {
                minHeight: 32,
                borderRadius: Radius.sm,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 8,
                backgroundColor: Colors.accent,
                opacity: soldOut ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              {added && !soldOut ? (
                <Ionicons name="checkmark" size={12} color={Colors.onAccent} />
              ) : null}
              <Text
                style={{
                  fontFamily: Fonts.bodyBold,
                  fontSize: 11,
                  letterSpacing: 0.8,
                  color: Colors.onAccent,
                }}
              >
                {soldOut ? "Esgotado" : added ? "Adicionado" : "Comprar"}
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

/** Memo: a grade toda re-renderiza junto quando a tela muda — card não. */
export const ProductCard = memo(ProductCardImpl);

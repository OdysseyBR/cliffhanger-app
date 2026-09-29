/**
 * Grade de produtos 2 colunas (responsiva) — usada em Loja e Buscar.
 */
import { useWindowDimensions, View } from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { ProductCard } from "@/components/ProductCard";
import { ScreenPadding } from "@/constants/theme";
import type { Product } from "@/lib/types";

interface ProductGridProps {
  products: Product[];
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
}

export function ProductGrid({ products, emptyTitle, emptyMessage, emptyIcon }: ProductGridProps) {
  const { width } = useWindowDimensions();
  const gutters = ScreenPadding * 2 + 12;
  const columns = width >= 720 ? 3 : 2;
  const cardWidth = Math.min(300, (Math.min(width, 840) - gutters) / columns);

  if (products.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon ?? "search-outline"}
        title={emptyTitle ?? "Nenhum item encontrado."}
        message={emptyMessage}
      />
    );
  }

  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        paddingHorizontal: ScreenPadding,
        justifyContent: "center",
      }}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} width={cardWidth} rating />
      ))}
    </View>
  );
}

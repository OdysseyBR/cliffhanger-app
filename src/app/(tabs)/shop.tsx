/**
 * Loja — grade do catálogo com filtros de categoria.
 */
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { ProductGrid } from "@/components/ProductGrid";
import { Loading, Screen } from "@/components/Screen";
import { Colors, Fonts, Radius, ScreenPadding } from "@/constants/theme";
import { CATEGORY_LABELS } from "@/lib/catalog";
import type { ProductCategory } from "@/lib/types";
import { useCatalog } from "@/lib/useCatalog";

type Filter = ProductCategory | "todos";

export default function ShopScreen() {
  const { catalog, loading, error, reload } = useCatalog();
  const [filter, setFilter] = useState<Filter>("todos");

  const categories = useMemo(() => {
    if (!catalog) return [] as { value: Filter; label: string; count: number }[];
    const counts = new Map<ProductCategory, number>();
    for (const product of catalog.products) {
      counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
    }
    return (Object.keys(CATEGORY_LABELS) as ProductCategory[])
      .filter((category) => (counts.get(category) ?? 0) > 0)
      .map((category) => ({
        value: category as Filter,
        label: CATEGORY_LABELS[category],
        count: counts.get(category) ?? 0,
      }));
  }, [catalog]);

  if (loading && !catalog) {
    return <Loading label="Carregando a loja…" />;
  }

  if (error && !catalog) {
    return (
      <Screen scroll={false}>
        <EmptyState
          icon="cloud-offline-outline"
          title="Não foi possível carregar a loja."
          message={error}
          actionLabel="Tentar novamente"
          onAction={reload}
        />
      </Screen>
    );
  }

  const products = catalog?.products ?? [];
  const filtered = filter === "todos" ? products : products.filter((p) => p.category === filter);

  return (
    <Screen
      onRefresh={async () => {
        reload();
      }}
      refreshing={false}
    >
      <View style={{ paddingTop: 16, gap: 12 }}>
        <Text
          style={{
            paddingHorizontal: ScreenPadding,
            fontFamily: Fonts.display,
            fontSize: 26,
            letterSpacing: 1.4,
            color: Colors.text,
          }}
        >
          LOJA
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: ScreenPadding }}
        >
          <Chip label={`Todos (${products.length})`} active={filter === "todos"} onPress={() => setFilter("todos")} />
          {categories.map((category) => (
            <Chip
              key={category.value}
              label={`${category.label} (${category.count})`}
              active={filter === category.value}
              onPress={() => setFilter(category.value)}
            />
          ))}
        </ScrollView>

        <Text
          style={{
            paddingHorizontal: ScreenPadding,
            fontFamily: Fonts.body,
            fontSize: 12,
            color: Colors.textFaint,
          }}
        >
          {filtered.length} {filtered.length === 1 ? "item" : "itens"}
        </Text>

        <ProductGrid
          products={filtered}
          emptyTitle="Nenhum item nesta categoria."
          emptyMessage="Escolha outro filtro acima."
          emptyIcon="cube-outline"
        />
      </View>
    </Screen>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: Radius.pill,
          borderWidth: 1,
          borderColor: active ? Colors.accent : Colors.border,
          backgroundColor: active ? Colors.accent : Colors.surface,
          opacity: pressed && !active ? 0.7 : 1,
        },
      ]}
    >
      <Text
        style={{
          fontFamily: Fonts.bodySemi,
          fontSize: 12.5,
          color: active ? Colors.onAccent : Colors.textMuted,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

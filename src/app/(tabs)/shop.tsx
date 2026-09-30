/**
 * Loja — grade do catálogo com filtros de categoria. O filtro é derivado de
 * `?filter=` (fonte única): os atalhos da home chegam via params e os chips
 * atualizam os params da própria rota.
 */
import { router, useLocalSearchParams } from "expo-router";
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

/** Ordenação da grade (mesmas opções do "Ordenar por" do site). */
type Sort = "relevancia" | "menor" | "maior" | "avaliados";

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "relevancia", label: "Relevância" },
  { value: "menor", label: "Menor preço" },
  { value: "maior", label: "Maior preço" },
  { value: "avaliados", label: "Melhor avaliados" },
];

const VALID_FILTERS = new Set<string>([
  "todos",
  "livros",
  "ebooks",
  "audiobooks",
  "produtos",
  "colecionaveis",
]);

function normalizeFilter(value: string | string[] | undefined): Filter {
  const v = Array.isArray(value) ? value[0] : value;
  return v && VALID_FILTERS.has(v) ? (v as Filter) : "todos";
}

export default function ShopScreen() {
  const params = useLocalSearchParams<{ filter?: string }>();
  const { catalog, loading, error, reload } = useCatalog();
  const filter = normalizeFilter(params.filter);
  const [sort, setSort] = useState<Sort>("relevancia");
  const selectFilter = (value: Filter) => {
    void router.setParams({ filter: value });
  };

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

  // grade filtrada + ordenada (ordem do catálogo em "relevância")
  const visible = useMemo(() => {
    const base = !catalog
      ? []
      : filter === "todos"
        ? catalog.products
        : catalog.products.filter((p) => p.category === filter);
    if (sort === "menor") return [...base].sort((a, b) => a.price - b.price);
    if (sort === "maior") return [...base].sort((a, b) => b.price - a.price);
    if (sort === "avaliados") {
      return [...base].sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    }
    return base;
  }, [catalog, filter, sort]);

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

  return (
    <Screen
      onRefresh={async () => {
        reload();
      }}
      refreshing={false}
    >
      <View style={{ paddingTop: 16, gap: 12 }}>
        <View style={{ paddingHorizontal: ScreenPadding, gap: 6 }}>
          <Text
            style={{
              fontFamily: Fonts.display,
              fontSize: 26,
              letterSpacing: 1.4,
              color: Colors.text,
            }}
          >
            LOJA
          </Text>
          <Text
            style={{
              fontFamily: Fonts.body,
              fontSize: 13.5,
              lineHeight: 19,
              color: Colors.textMuted,
            }}
          >
            Catálogo completo da Cliffhanger — livros, e-books, audiobooks, produtos e
            colecionáveis.
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: ScreenPadding }}
        >
          <Chip label={`Todos (${products.length})`} active={filter === "todos"} onPress={() => selectFilter("todos")} />
          {categories.map((category) => (
            <Chip
              key={category.value}
              label={`${category.label} (${category.count})`}
              active={filter === category.value}
              onPress={() => selectFilter(category.value)}
            />
          ))}
        </ScrollView>

        <Text
          style={{
            paddingHorizontal: ScreenPadding,
            fontFamily: Fonts.bodyBold,
            fontSize: 10,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            color: Colors.accent,
          }}
        >
          Ordenar por
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: ScreenPadding }}
        >
          {SORT_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              active={sort === option.value}
              onPress={() => setSort(option.value)}
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
          {visible.length} {visible.length === 1 ? "item" : "itens"}
        </Text>

        <ProductGrid
          products={visible}
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

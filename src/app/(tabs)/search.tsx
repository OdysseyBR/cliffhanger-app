/**
 * Buscar — busca textual no catálogo (§6.3: produtos, autores, obras,
 * universos). Aceita pré-preenchimento via parâmetro `q` (trilho de universos).
 */
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { ProductGrid } from "@/components/ProductGrid";
import { Loading, Screen } from "@/components/Screen";
import { Colors, Fonts, Radius, ScreenPadding } from "@/constants/theme";
import { searchProducts } from "@/lib/catalog";
import { useCatalog } from "@/lib/useCatalog";

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const { catalog, loading, error, reload } = useCatalog();
  const paramQ = typeof params.q === "string" && params.q.length > 0 ? params.q : null;
  const [query, setQuery] = useState(paramQ ?? "");
  const [appliedQ, setAppliedQ] = useState<string | null>(paramQ);

  // sincroniza quando outra tela empurra um novo `q` (trilho de universos)
  if (paramQ !== null && paramQ !== appliedQ) {
    setAppliedQ(paramQ);
    setQuery(paramQ);
  }

  const results = useMemo(() => {
    if (!catalog) return [];
    return searchProducts(catalog.products, catalog.authors, catalog.works, catalog.universes, query);
  }, [catalog, query]);

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

  const hasQuery = query.trim().length > 0;

  return (
    <Screen contentStyle={{ paddingTop: 16 }}>
      <Text
        style={{
          paddingHorizontal: ScreenPadding,
          fontFamily: Fonts.display,
          fontSize: 26,
          letterSpacing: 1.4,
          color: Colors.text,
          marginBottom: 12,
        }}
      >
        BUSCAR
      </Text>

      <View
        style={{
          marginHorizontal: ScreenPadding,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: Colors.surfaceAlt,
          borderWidth: 1,
          borderColor: Colors.border,
          borderRadius: Radius.sm,
          paddingHorizontal: 12,
          gap: 8,
        }}
      >
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Título, autor, obra ou universo"
          placeholderTextColor={Colors.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={{
            flex: 1,
            minHeight: 48,
            fontFamily: Fonts.body,
            fontSize: 15,
            color: Colors.text,
            paddingVertical: 10,
          }}
        />
        {hasQuery ? (
          <Pressable onPress={() => setQuery("")} hitSlop={8} accessibilityLabel="Limpar busca">
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {hasQuery ? (
        <Text
          style={{
            paddingHorizontal: ScreenPadding,
            marginTop: 12,
            marginBottom: 12,
            fontFamily: Fonts.body,
            fontSize: 12,
            color: Colors.textFaint,
          }}
        >
          {results.length} {results.length === 1 ? "resultado" : "resultados"} para “{query.trim()}”
        </Text>
      ) : null}

      <View style={{ marginTop: hasQuery ? 0 : 8 }}>
        {!hasQuery ? (
          <EmptyState
            icon="search-outline"
            title="O que você procura?"
            message="Busque por título, autor, obra ou universo do catálogo Cliffhanger."
          />
        ) : (
          <ProductGrid
            products={results}
            emptyTitle={`Nada encontrado para “${query.trim()}”.`}
            emptyMessage="Tente outro termo ou veja a loja completa."
            emptyIcon="search-outline"
          />
        )}
      </View>
    </Screen>
  );
}

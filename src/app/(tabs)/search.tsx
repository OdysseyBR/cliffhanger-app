/**
 * Buscar — busca textual no catálogo (§6.3: produtos, autores, obras,
 * universos). Aceita pré-preenchimento via parâmetro `q` (trilho de universos).
 */
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Keyboard, Pressable, Text, TextInput, View } from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { ProductGrid } from "@/components/ProductGrid";
import { Loading, Screen } from "@/components/Screen";
import { Colors, Fonts, Radius, ScreenPadding, useThemeColors } from "@/constants/theme";
import { searchProducts } from "@/lib/catalog";
import { useCatalog } from "@/lib/useCatalog";

export default function SearchScreen() {
  useThemeColors();
  const params = useLocalSearchParams<{ q?: string }>();
  const { catalog, loading, error, reload } = useCatalog();
  const paramQ = typeof params.q === "string" && params.q.length > 0 ? params.q : null;
  const [query, setQuery] = useState(paramQ ?? "");
  const [appliedQ, setAppliedQ] = useState<string | null>(paramQ);
  const [focused, setFocused] = useState(false);

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
      <View style={{ paddingHorizontal: ScreenPadding, gap: 6, marginBottom: 12 }}>
        <Text
          style={{
            fontFamily: Fonts.display,
            fontSize: 26,
            letterSpacing: 1.4,
            color: Colors.text,
          }}
        >
          BUSCAR
        </Text>
        <Text
          style={{
            fontFamily: Fonts.body,
            fontSize: 13.5,
            lineHeight: 19,
            color: Colors.textMuted,
          }}
        >
          Obras, produtos, e-books, audiobooks, autores e universos.
        </Text>
      </View>

      <View
        style={{
          marginHorizontal: ScreenPadding,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: Colors.surfaceAlt,
            borderWidth: 1,
            borderColor: focused ? Colors.accent : Colors.border,
            borderRadius: Radius.sm,
            paddingHorizontal: 12,
            gap: 8,
          }}
        >
          <Ionicons name="search" size={18} color={focused ? Colors.accent : Colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Ex.: valeharts, caneca, helena..."
            placeholderTextColor={Colors.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={() => Keyboard.dismiss()}
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

        <Pressable
          onPress={() => Keyboard.dismiss()}
          accessibilityRole="button"
          accessibilityLabel="Buscar"
          style={({ pressed }) => [
            {
              height: 48,
              paddingHorizontal: 18,
              borderRadius: Radius.sm,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: Colors.accent,
              opacity: pressed ? 0.85 : 1,
              shadowColor: Colors.accent,
              shadowOpacity: 0.45,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            },
          ]}
        >
          <Text
            style={{
              fontFamily: Fonts.bodyBold,
              fontSize: 13,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: Colors.onAccent,
            }}
          >
            Buscar
          </Text>
        </Pressable>
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
          <View
            style={{
              marginHorizontal: ScreenPadding,
              borderWidth: 1,
              borderColor: Colors.border,
              borderRadius: Radius.lg,
              paddingVertical: 36,
              paddingHorizontal: 20,
              alignItems: "center",
              gap: 10,
            }}
          >
            <Text
              style={{
                fontFamily: Fonts.display,
                fontSize: 22,
                letterSpacing: 1.2,
                color: Colors.text,
                textAlign: "center",
              }}
            >
              DIGITE ALGO PARA COMEÇAR
            </Text>
            <Text
              style={{
                fontFamily: Fonts.body,
                fontSize: 13.5,
                lineHeight: 19,
                color: Colors.textMuted,
                textAlign: "center",
              }}
            >
              A busca é global e retorna obras, produtos, autores e universos ao mesmo tempo.
            </Text>
          </View>
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

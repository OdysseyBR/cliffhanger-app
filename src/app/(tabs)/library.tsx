/**
 * Biblioteca digital (Doc Mestre §8 / §10.2) — itens da conta com progresso
 * de leitura/escuta. Visitante recebe convite de login.
 */
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { BookCover } from "@/components/BookCover";
import { EmptyState } from "@/components/EmptyState";
import { ProgressBar } from "@/components/ProgressBar";
import { Loading, Screen } from "@/components/Screen";
import { Colors, Fonts, Radius, ScreenPadding } from "@/constants/theme";
import { formatDate } from "@/lib/catalog";
import type { LibraryData, LibraryItem, Product, ReadingProgress } from "@/lib/types";
import { useAuth } from "@/lib/useAuth";
import { useCatalog } from "@/lib/useCatalog";
import { loadLibrary } from "@/lib/api";

interface LibraryState {
  loading: boolean;
  data: LibraryData | null;
  error: string | null;
}

function LibraryRow({
  item,
  progress,
  products,
}: {
  item: LibraryItem;
  progress: Record<string, ReadingProgress>;
  products: Product[];
}) {
  const product = products.find((p) => p.id === item.productId);
  const percent = progress[item.productId]?.percent ?? 0;
  const purchased = formatDate(item.purchasedAt);
  const open = item.type === "audiobook" ? "/player/[id]" : "/reader/[id]";

  return (
    <Pressable
      onPress={() => router.push({ pathname: open, params: { id: item.productId } })}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          gap: 12,
          padding: 12,
          borderRadius: Radius.md,
          backgroundColor: Colors.surface,
          borderWidth: 1,
          borderColor: Colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View
        style={{
          width: 58,
          height: 87,
          borderRadius: Radius.sm,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: Colors.line,
          backgroundColor: Colors.surfaceAlt,
        }}
      >
        <BookCover cover={product?.cover} title={item.title} />
      </View>

      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons
            name={item.type === "audiobook" ? "headset-outline" : "book-outline"}
            size={13}
            color={Colors.accent}
          />
          <Text
            style={{
              fontFamily: Fonts.bodyMedium,
              fontSize: 10.5,
              letterSpacing: 1,
              color: Colors.accent,
              textTransform: "uppercase",
            }}
          >
            {item.type === "audiobook" ? "Audiobook" : "E-book"}
            {item.source === "plus" ? " · Cliffhanger+" : ""}
          </Text>
        </View>

        <Text
          numberOfLines={2}
          style={{ fontFamily: Fonts.bodySemi, fontSize: 14, lineHeight: 18, color: Colors.text }}
        >
          {item.title}
        </Text>

        <View style={{ gap: 4 }}>
          <ProgressBar percent={percent} />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <Text style={{ fontFamily: Fonts.body, fontSize: 10.5, color: Colors.textFaint }}>
              {percent > 0 ? `${percent}% concluído` : "Não iniciado"}
            </Text>
            {purchased ? (
              <Text style={{ fontFamily: Fonts.body, fontSize: 10.5, color: Colors.textFaint }}>
                {purchased}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function LibraryScreen() {
  const { user, loading: authLoading, getIdToken } = useAuth();
  const { catalog } = useCatalog();
  const [state, setState] = useState<LibraryState>({ loading: false, data: null, error: null });

  // busca semefeito colateral: devolve o estado e quem chama aplica
  const fetchLibrary = useCallback(async (): Promise<LibraryState> => {
    const token = await getIdToken();
    if (!user || !token) {
      return user
        ? { loading: false, data: null, error: "Sessão expirada. Entre novamente." }
        : { loading: false, data: null, error: null };
    }
    try {
      const data = await loadLibrary(token);
      return { loading: false, data, error: null };
    } catch (e) {
      return {
        loading: false,
        data: null,
        error: e instanceof Error ? e.message : "Falha ao carregar a biblioteca.",
      };
    }
  }, [user, getIdToken]);

  // atualização sob demanda (eventos: pull-to-refresh e “tentar novamente”)
  const refreshLibrary = useCallback(() => {
    void fetchLibrary().then((next) => setState(next));
  }, [fetchLibrary]);

  // pull-to-refresh: aplica o resultado e anima o spinner
  const pullRefresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true }));
    const next = await fetchLibrary();
    setState(next);
  }, [fetchLibrary]);

  // montagem: o setState acontece só no callback do .then
  useEffect(() => {
    let cancelled = false;
    void fetchLibrary().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchLibrary]);

  if (authLoading || (user && !state.data && !state.error)) {
    return <Loading label="Carregando sua biblioteca…" />;
  }

  if (!user) {
    return (
      <Screen scroll={false}>
        <EmptyState
          icon="library-outline"
          title="Entre para ver sua biblioteca"
          message="E-books e audiobooks adquiridos ficam disponíveis na sua conta única Cliffhanger."
          actionLabel="Entrar"
          onAction={() => router.push("/account")}
        />
      </Screen>
    );
  }

  if (state.error && !state.data) {
    return (
      <Screen scroll={false}>
        <EmptyState
          icon="alert-circle-outline"
          title={state.error}
          actionLabel="Tentar novamente"
          onAction={refreshLibrary}
        />
      </Screen>
    );
  }

  const items = state.data?.items ?? [];
  const progress = state.data?.progress ?? {};
  const products = catalog?.products ?? [];
  const ebooks = items.filter((i) => i.type === "ebook");
  const audios = items.filter((i) => i.type === "audiobook");

  if (items.length === 0) {
    return (
      <Screen scroll={false}>
        <EmptyState
          icon="book-outline"
          title="Sua biblioteca está vazia."
          message="Adquira e-books ou audiobooks na loja e eles aparecem aqui — com progresso sincronizado entre app e site."
          actionLabel="Ver a loja"
          onAction={() => router.push("/shop")}
        />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={pullRefresh} refreshing={state.loading}>
      <View style={{ paddingTop: 16, paddingHorizontal: ScreenPadding, gap: 20 }}>
        <View>
          <Text
            style={{
              fontFamily: Fonts.display,
              fontSize: 26,
              letterSpacing: 1.4,
              color: Colors.text,
            }}
          >
            BIBLIOTECA
          </Text>
          <Text
            style={{
              marginTop: 2,
              fontFamily: Fonts.body,
              fontSize: 12.5,
              color: Colors.textMuted,
            }}
          >
            {items.length} {items.length === 1 ? "item" : "itens"} · progresso sincronizado com a
            loja
          </Text>
        </View>

        {ebooks.length > 0 ? (
          <Section title="E-books">
            {ebooks.map((item) => (
              <LibraryRow key={item.id} item={item} progress={progress} products={products} />
            ))}
          </Section>
        ) : null}

        {audios.length > 0 ? (
          <Section title="Audiobooks">
            {audios.map((item) => (
              <LibraryRow key={item.id} item={item} progress={progress} products={products} />
            ))}
          </Section>
        ) : null}
      </View>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Text
        style={{
          fontFamily: Fonts.display,
          fontSize: 20,
          letterSpacing: 1.2,
          color: Colors.text,
        }}
      >
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

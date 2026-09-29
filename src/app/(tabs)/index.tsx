/**
 * Home do app — Documento Mestre §10.2:
 * Continue lendo · Continue ouvindo · Recomendado para você · Novidades ·
 * Seus universos · Wishlist · Próximos lançamentos.
 *
 * Visitante vê um convite de conta única + as seções públicas; na sessão,
 * entram biblioteca (progresso real) e wishlist.
 */
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { BookCover } from "@/components/BookCover";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { ProductCard } from "@/components/ProductCard";
import { ProgressBar } from "@/components/ProgressBar";
import { Rail } from "@/components/Rail";
import { Loading, Screen } from "@/components/Screen";
import { Colors, Fonts, Radius, ScreenPadding } from "@/constants/theme";
import { loadLibrary } from "@/lib/api";
import { formatDate, launches, recommended, upcomingLaunches } from "@/lib/catalog";
import type { LibraryData, LibraryItem, Product, ReadingProgress, Universe } from "@/lib/types";
import { useAuth } from "@/lib/useAuth";
import { useCatalog } from "@/lib/useCatalog";

interface LibraryState {
  loading: boolean;
  data: LibraryData | null;
  error: string | null;
}

const LIB_IDLE: LibraryState = { loading: false, data: null, error: null };

/** Convite para visitante (conta única §37). */
function InviteCard() {
  return (
    <View
      style={{
        marginHorizontal: ScreenPadding,
        marginBottom: 24,
        padding: 16,
        borderRadius: Radius.md,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Ionicons name="person-circle-outline" size={32} color={Colors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: Fonts.bodySemi, fontSize: 15, color: Colors.text }}>
            Continue de onde parou
          </Text>
          <Text
            style={{
              fontFamily: Fonts.body,
              fontSize: 13,
              lineHeight: 18,
              color: Colors.textMuted,
              marginTop: 2,
            }}
          >
            Entre com sua conta Cliffhanger para ver biblioteca, progresso e wishlist — a mesma
            da loja.
          </Text>
        </View>
      </View>
      <Button
        label="Entrar"
        onPress={() => router.push("/account")}
        style={{ minHeight: 44 }}
      />
    </View>
  );
}

/** Card da biblioteca no trilho (capa + progresso). */
function LibraryRailCard({
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

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: item.type === "audiobook" ? "/player/[id]" : "/reader/[id]",
          params: { id: item.productId },
        })
      }
      style={({ pressed }) => [{ width: 150, opacity: pressed ? 0.85 : 1 }]}
      accessibilityLabel={item.title}
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
        <BookCover cover={product?.cover} title={item.title} />
        {item.source === "plus" ? (
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
                fontSize: 8,
                letterSpacing: 0.6,
                color: Colors.onAccent,
              }}
            >
              CLIFFHANGER+
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
        {item.title}
      </Text>
      <View style={{ marginTop: 6, gap: 4 }}>
        <ProgressBar percent={percent} />
        <Text style={{ fontFamily: Fonts.body, fontSize: 10, color: Colors.textFaint }}>
          {percent > 0 ? `${percent}% concluído` : "Não iniciado"}
        </Text>
      </View>
    </Pressable>
  );
}

/** Card de universo — toque leva à busca por aquele universo. */
function UniverseRailCard({ universe }: { universe: Universe }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/search", params: { q: universe.name } })}
      style={({ pressed }) => [{ width: 150, opacity: pressed ? 0.85 : 1 }]}
      accessibilityLabel={universe.name}
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
        <BookCover cover={universe.cover} title={universe.name} />
      </View>
      <Text
        numberOfLines={1}
        style={{ marginTop: 8, fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.text }}
      >
        {universe.name}
      </Text>
      <Text
        numberOfLines={2}
        style={{ marginTop: 2, fontFamily: Fonts.body, fontSize: 11, color: Colors.textFaint }}
      >
        {universe.tagline}
      </Text>
    </Pressable>
  );
}

/** Trilho de biblioteca com seus estados (carregando/erro/vazio). */
function LibraryRail({
  title,
  items,
  progress,
  products,
  state,
  onRetry,
}: {
  title: string;
  items: LibraryItem[];
  progress: Record<string, ReadingProgress>;
  products: Product[];
  state: LibraryState;
  onRetry: () => void;
}) {
  let content: ReactNode;
  if (!state.data && !state.error) {
    content = <EmptyState compact icon="time-outline" title="Carregando sua biblioteca…" />;
  } else if (state.error) {
    content = (
      <EmptyState
        compact
        icon="alert-circle-outline"
        title={state.error}
        actionLabel="Tentar novamente"
        onAction={onRetry}
      />
    );
  } else if (items.length === 0) {
    content = (
      <EmptyState
        compact
        icon="book-outline"
        title="Nada por aqui ainda — adquira um e-book ou audiobook na loja."
        actionLabel="Ver a loja"
        onAction={() => router.push("/shop")}
      />
    );
  } else {
    content = items.map((item) => (
      <LibraryRailCard key={item.id} item={item} progress={progress} products={products} />
    ));
  }

  return <Rail title={title}>{content}</Rail>;
}

export default function HomeScreen() {
  const { catalog, loading, error, reload } = useCatalog();
  const { user, loading: authLoading, wishlist, getIdToken } = useAuth();
  const [library, setLibrary] = useState<LibraryState>(LIB_IDLE);
  const [refreshing, setRefreshing] = useState(false);

  // busca semefeito colateral: devolve o estado e quem chama aplica
  const fetchLibrary = useCallback(async (): Promise<LibraryState> => {
    const token = await getIdToken();
    if (!user || !token) {
      return user
        ? { loading: false, data: null, error: "Sessão expirada. Entre novamente." }
        : LIB_IDLE;
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

  // atualização sob demanda (pull-to-refresh e “tentar novamente”)
  const refreshLibrary = useCallback(() => {
    void fetchLibrary().then((next) => setLibrary(next));
  }, [fetchLibrary]);

  // montagem: o setState acontece só no callback do .then
  useEffect(() => {
    let cancelled = false;
    void fetchLibrary().then((next) => {
      if (!cancelled) setLibrary(next);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchLibrary]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    reload();
    const next = await fetchLibrary();
    setLibrary(next);
    setRefreshing(false);
  }, [reload, fetchLibrary]);

  if (authLoading || (loading && !catalog)) {
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

  if (!catalog) {
    return <Loading label="Carregando a loja…" />;
  }

  const { products, universes } = catalog;

  if (products.length === 0) {
    return (
      <Screen scroll={false}>
        <EmptyState
          icon="cube-outline"
          title="O catálogo está vazio."
          message="Novos itens chegarão em breve."
        />
      </Screen>
    );
  }

  const recentes = launches(products);
  const novidades = (
    recentes.length > 0
      ? recentes
      : [...products].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
  ).slice(0, 10);
  const rec = recommended(products).slice(0, 10);
  const upcoming = upcomingLaunches(products).slice(0, 10);
  const wished = wishlist
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));

  const items = library.data?.items ?? [];
  const progress = library.data?.progress ?? {};
  const ebooks = items.filter((i) => i.type === "ebook");
  const audios = items.filter((i) => i.type === "audiobook");

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing} contentStyle={{ paddingTop: 16 }}>
      {!user ? <InviteCard /> : null}

      {user ? (
        <LibraryRail
          title="Continue lendo"
          items={ebooks}
          progress={progress}
          products={products}
          state={library}
          onRetry={refreshLibrary}
        />
      ) : null}

      {user ? (
        <LibraryRail
          title="Continue ouvindo"
          items={audios}
          progress={progress}
          products={products}
          state={library}
          onRetry={refreshLibrary}
        />
      ) : null}

      <Rail title="Recomendado para você">
        {rec.map((product) => (
          <ProductCard key={product.id} product={product} width={140} />
        ))}
      </Rail>

      <Rail title="Novidades">
        {novidades.map((product) => (
          <ProductCard key={product.id} product={product} width={140} />
        ))}
      </Rail>

      {universes.length > 0 ? (
        <Rail
          title="Seus universos"
          actionLabel="Buscar"
          onAction={() => router.push("/search")}
        >
          {universes.map((universe) => (
            <UniverseRailCard key={universe.id} universe={universe} />
          ))}
        </Rail>
      ) : null}

      {user ? (
        <Rail title="Wishlist">
          {wished.length === 0 ? (
            <EmptyState
              compact
              icon="heart-outline"
              title="Sua wishlist está vazia."
              message="Toque no coração de um produto para salvá-lo aqui."
            />
          ) : (
            wished.map((product) => (
              <ProductCard key={product.id} product={product} width={140} />
            ))
          )}
        </Rail>
      ) : null}

      <Rail title="Próximos lançamentos">
        {upcoming.length === 0 ? (
          <EmptyState
            compact
            icon="calendar-outline"
            title="Nenhum lançamento agendado no momento."
          />
        ) : (
          upcoming.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              width={150}
              subtitle={
                product.releaseDate
                  ? `Sai em ${formatDate(product.releaseDate) ?? "breve"}`
                  : undefined
              }
            />
          ))
        )}
      </Rail>
    </Screen>
  );
}

/**
 * Leitor de e-book (Doc Mestre §8 / §10) — pdf.js no palco (WebView nativo
 * e iframe web com o MESMO HTML), navegação por página e progresso salvo
 * na conta via PUT /api/library/progress/{productId} (mesmo contrato do site).
 */
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PdfCanvas from "@/components/PdfCanvas";
import { EmptyState } from "@/components/EmptyState";
import { Loading } from "@/components/Screen";
import { Colors, Fonts, Radius, ScreenPadding } from "@/constants/theme";
import { loadLibrary, resolveFileUrl, saveProgress } from "@/lib/api";
import type { LibraryItem, ReadingProgress } from "@/lib/types";
import { useAuth } from "@/lib/useAuth";

interface ReaderState {
  loading: boolean;
  item: LibraryItem | null;
  progress: ReadingProgress | null;
  error: string | null;
}

const INITIAL: ReaderState = {
  loading: true,
  item: null,
  progress: null,
  error: null,
};

function NavButton({
  icon,
  disabled,
  onPress,
}: {
  icon: "chevron-back" | "chevron-forward";
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={icon === "chevron-back" ? "Página anterior" : "Próxima página"}
      hitSlop={8}
      style={({ pressed }) => [
        {
          width: 46,
          height: 46,
          borderRadius: 23,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: Colors.border,
          backgroundColor: Colors.surface,
          opacity: disabled ? 0.35 : pressed ? 0.6 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={22} color={Colors.text} />
    </Pressable>
  );
}

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading, getIdToken } = useAuth();

  const [state, setState] = useState<ReaderState>(INITIAL);
  const [pages, setPages] = useState(0);
  /** null = ainda não renderizado — a tela segue o progresso salvo */
  const [page, setPage] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const file = useMemo(
    () => state.item?.files.find((f) => f.kind === "pdf") ?? null,
    [state.item],
  );
  const url = file ? resolveFileUrl(file.url) : null;
  const startPage =
    state.progress?.page && state.progress.page > 0 ? state.progress.page : 1;
  const effectivePage = page ?? startPage;
  const percent = ready && pages > 0 ? Math.round((effectivePage / pages) * 100) : 0;

  const fetchReader = useCallback(async (): Promise<ReaderState> => {
    const token = await getIdToken();
    if (!user || !token) {
      return { loading: false, item: null, progress: null, error: null };
    }
    try {
      const data = await loadLibrary(token);
      const item = data.items.find((i) => i.productId === id) ?? null;
      if (!item) {
        return {
          loading: false,
          item: null,
          progress: null,
          error: "Este item não está na sua biblioteca.",
        };
      }
      if (!item.files.some((f) => f.kind === "pdf")) {
        return {
          loading: false,
          item,
          progress: data.progress[id] ?? null,
          error: "Este item não tem arquivo de leitura disponível.",
        };
      }
      return { loading: false, item, progress: data.progress[id] ?? null, error: null };
    } catch (e) {
      return {
        loading: false,
        item: null,
        progress: null,
        error: e instanceof Error ? e.message : "Falha ao abrir o leitor.",
      };
    }
  }, [user, getIdToken, id]);

  // montagem: o setState acontece só no callback do .then
  useEffect(() => {
    let cancelled = false;
    void fetchReader().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchReader]);

  const retry = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: null }));
    void fetchReader().then((next) => setState(next));
    setAttempt((current) => current + 1);
    setFailed(false);
    setReady(false);
    setPages(0);
    setPage(null);
  }, [fetchReader]);

  // -- progresso: flush lê refs, então nunca há setState em efeito ----------
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const latestRef = useRef({ page: startPage, pages: 0 });
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    const current = stateRef.current;
    const target = latestRef.current;
    if (!current.item || target.pages <= 0) return;
    const token = await getIdToken();
    if (!token) return;
    await saveProgress(token, current.item.productId, {
      kind: "ebook",
      page: target.page,
      pages: target.pages,
      percent: Math.round((target.page / target.pages) * 100),
      bookmarks: current.progress?.bookmarks ?? [],
    });
  }, [getIdToken]);

  const schedule = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (dirtyRef.current) {
        dirtyRef.current = false;
        void flush();
      }
    }, 1500);
  }, [flush]);

  useEffect(() => {
    if (!ready || pages <= 0) return;
    latestRef.current = { page: effectivePage, pages };
    dirtyRef.current = true;
    schedule();
  }, [effectivePage, pages, ready, schedule]);

  // desmontagem: guarda a última posição (melhor esforço)
  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        if (dirtyRef.current) {
          dirtyRef.current = false;
          void flush();
        }
      }
    },
    [flush],
  );

  const handleReady = useCallback((total: number) => {
    setPages(total);
    setReady(true);
  }, []);
  const handlePage = useCallback((next: number) => setPage(next), []);
  const handleError = useCallback(() => {
    setFailed(true);
    setReady(false);
  }, []);

  if (!authLoading && !user) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <EmptyState
          icon="book-outline"
          title="Entre para ler seus e-books."
          message="Seus e-books e audiobooks ficam na sua Cliffhanger Account — a mesma do site."
          actionLabel="Entrar"
          onAction={() => router.push("/account")}
        />
      </View>
    );
  }

  if (authLoading || state.loading) {
    return <Loading label="Abrindo o leitor…" />;
  }

  if (state.error || !file) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <EmptyState
          icon="alert-circle-outline"
          title={state.error ?? "Arquivo de leitura indisponível."}
          actionLabel="Tentar novamente"
          onAction={retry}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* cabeçalho: volta, título e página atual */}
      <View
        style={{
          paddingTop: insets.top + 6,
          paddingBottom: 8,
          paddingHorizontal: ScreenPadding,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Voltar"
          hitSlop={8}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: Fonts.display,
              fontSize: 18,
              letterSpacing: 1,
              color: Colors.text,
            }}
          >
            {state.item?.title.toUpperCase()}
          </Text>
          <Text
            style={{ fontFamily: Fonts.body, fontSize: 11, color: Colors.textFaint, marginTop: 1 }}
          >
            {ready && pages > 0 ? `página ${effectivePage} de ${pages}` : "abrindo…"}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: Colors.surface,
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: Radius.sm,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
        >
          <Text
            style={{ fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.accent }}
          >
            {percent}%
          </Text>
        </View>
      </View>

      {/* palco do pdf.js */}
      <View style={{ flex: 1 }}>
        {!failed && url ? (
          <PdfCanvas
            key={`${url}:${attempt}`}
            url={url}
            startPage={startPage}
            page={effectivePage}
            onReady={handleReady}
            onPage={handlePage}
            onError={handleError}
          />
        ) : null}

        {failed ? (
          <EmptyState
            icon="document-outline"
            title="Não foi possível abrir este arquivo."
            message="Verifique sua conexão e tente novamente."
            actionLabel="Tentar novamente"
            onAction={retry}
          />
        ) : null}

        {!ready && !failed ? (
          <View
            style={{
              pointerEvents: "none",
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <ActivityIndicator color={Colors.accent} size="large" />
            <Text
              style={{
                fontFamily: Fonts.bodyMedium,
                fontSize: 12,
                letterSpacing: 1.4,
                color: Colors.accent,
              }}
            >
              ABRINDO O E-BOOK…
            </Text>
          </View>
        ) : null}
      </View>

      {/* rodapé: barra de progresso + navegação */}
      <View
        style={{
          paddingTop: 10,
          paddingBottom: insets.bottom + 12,
          paddingHorizontal: ScreenPadding,
          gap: 8,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
        }}
      >
        <View
          style={{
            height: 4,
            borderRadius: 2,
            backgroundColor: Colors.line,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${percent}%`,
              backgroundColor: Colors.accent,
              borderRadius: 2,
            }}
          />
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <NavButton
            icon="chevron-back"
            disabled={effectivePage <= 1}
            onPress={() => setPage(effectivePage - 1)}
          />
          <Text
            style={{
              fontFamily: Fonts.bodySemi,
              fontSize: 14,
              color: Colors.textMuted,
              letterSpacing: 0.6,
            }}
          >
            {ready && pages > 0 ? `${effectivePage} / ${pages}` : "—"}
          </Text>
          <NavButton
            icon="chevron-forward"
            disabled={!ready || effectivePage >= pages}
            onPress={() => setPage(effectivePage + 1)}
          />
        </View>
      </View>
    </View>
  );
}

/**
 * Player de audiobook (Doc Mestre §8 / §10) — expo-audio (nativo + web),
 * posição salva na conta via PUT /api/library/progress/{productId} com o
 * mesmo contrato do site: kind "audiobook", position em segundos e percent.
 */
import { Ionicons } from "@expo/vector-icons";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BookCover } from "@/components/BookCover";
import { EmptyState } from "@/components/EmptyState";
import { Loading } from "@/components/Screen";
import { SeekBar } from "@/components/SeekBar";
import { Colors, Fonts, Radius, ScreenPadding } from "@/constants/theme";
import { loadLibrary, resolveFileUrl, saveProgress } from "@/lib/api";
import type { LibraryItem, ReadingProgress } from "@/lib/types";
import { useAuth } from "@/lib/useAuth";

interface PlayerState {
  loading: boolean;
  item: LibraryItem | null;
  progress: ReadingProgress | null;
  error: string | null;
}

const INITIAL: PlayerState = {
  loading: true,
  item: null,
  progress: null,
  error: null,
};

const RATES = [0.75, 1, 1.25, 1.5, 2];
const SAVE_INTERVAL_MS = 4000;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function ControlButton({
  icon,
  label,
  onPress,
  size = 52,
}: {
  icon: "play-skip-back" | "play-skip-forward";
  label: string;
  onPress: () => void;
  size?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: Colors.border,
          backgroundColor: Colors.surface,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={22} color={Colors.text} />
    </Pressable>
  );
}

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading, getIdToken } = useAuth();

  const [state, setState] = useState<PlayerState>(INITIAL);
  const [rate, setRate] = useState(1);

  const file = useMemo(
    () => state.item?.files.find((f) => f.kind === "audio") ?? null,
    [state.item],
  );
  const url = file ? resolveFileUrl(file.url) : null;

  // hooks sempre incondicionais — url é null enquanto a biblioteca carrega
  const player = useAudioPlayer(url, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);

  const fetchPlayer = useCallback(async (): Promise<PlayerState> => {
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
      if (!item.files.some((f) => f.kind === "audio")) {
        return {
          loading: false,
          item,
          progress: data.progress[id] ?? null,
          error: "Este item não tem áudio disponível.",
        };
      }
      return { loading: false, item, progress: data.progress[id] ?? null, error: null };
    } catch (e) {
      return {
        loading: false,
        item: null,
        progress: null,
        error: e instanceof Error ? e.message : "Falha ao abrir o player.",
      };
    }
  }, [user, getIdToken, id]);

  // montagem: o setState acontece só no callback do .then
  useEffect(() => {
    let cancelled = false;
    void fetchPlayer().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchPlayer]);

  // sessão de áudio: toca mesmo com o mudo ligado (iOS)
  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  // -- progresso: tudo por refs/flush — nunca setState dentro do efeito ----
  const stateRef = useRef(state);
  const startAtRef = useRef(0);
  // refs espelhados pós-commit (reescrever ref durante render é proibido
  // pelas regras do React Compiler — o efeito roda antes de qualquer flush)
  useEffect(() => {
    stateRef.current = state;
    startAtRef.current = state.progress?.position ?? 0;
  }, [state]);
  const latestRef = useRef({ pos: 0, pct: 0 });
  const dirtyRef = useRef(false);
  const lastSaveRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekDoneRef = useRef(false);

  const flush = useCallback(async () => {
    const current = stateRef.current;
    if (!current.item) return;
    const token = await getIdToken();
    if (!token) return;
    await saveProgress(token, current.item.productId, {
      kind: "audiobook",
      position: Math.round(latestRef.current.pos),
      percent: latestRef.current.pct,
      bookmarks: current.progress?.bookmarks ?? [],
    });
  }, [getIdToken]);

  const schedule = useCallback(
    (delay: number) => {
      if (timerRef.current) return;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (dirtyRef.current) {
          dirtyRef.current = false;
          void flush();
        }
      }, delay);
    },
    [flush],
  );

  const track = useCallback(
    (position: number) => {
      if (!(status.duration > 0)) return;
      latestRef.current = {
        pos: position,
        pct: Math.min(100, Math.round((position / status.duration) * 100)),
      };
      dirtyRef.current = true;
      const now = Date.now();
      if (now - lastSaveRef.current >= SAVE_INTERVAL_MS) {
        lastSaveRef.current = now;
        dirtyRef.current = false;
        void flush();
      }
    },
    [status.duration, flush],
  );

  // última posição salva: aplicada uma única vez quando o áudio carrega
  useEffect(() => {
    if (seekDoneRef.current || !(status.duration > 0)) return;
    seekDoneRef.current = true;
    const target = startAtRef.current;
    if (target > 1 && target < status.duration - 1) {
      void player.seekTo(target);
    }
  }, [status.duration, player]);

  // batida de reprodução: marca posição e salva no intervalo de 4 s
  useEffect(() => {
    if (!status.playing || !(status.duration > 0)) return;
    track(status.currentTime);
  }, [status.playing, status.currentTime, status.duration, track]);

  // pausa com posição pendente: grava imediatamente
  useEffect(() => {
    if (status.playing || !dirtyRef.current) return;
    dirtyRef.current = false;
    void flush();
  }, [status.playing, flush]);

  // desmontagem: guarda a última posição (melhor esforço)
  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (dirtyRef.current) {
        dirtyRef.current = false;
        void flush();
      }
    },
    [flush],
  );

  const seekToSeconds = useCallback(
    (seconds: number) => {
      if (!(status.duration > 0)) return;
      const clamped = Math.max(0, Math.min(seconds, status.duration));
      void player.seekTo(clamped);
      track(clamped);
      schedule(1200);
    },
    [status.duration, player, track, schedule],
  );

  const togglePlay = useCallback(() => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.duration > 0 && status.currentTime >= status.duration - 0.5) {
      void player.seekTo(0);
    }
    player.play();
  }, [player, status.playing, status.duration, status.currentTime]);

  const skip = useCallback(
    (delta: number) => {
      if (!(status.duration > 0)) return;
      seekToSeconds(status.currentTime + delta);
    },
    [status.currentTime, status.duration, seekToSeconds],
  );

  const cycleRate = useCallback(() => {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    // API oficial do expo-audio (docs v57): a velocidade é atribuída direto
    // na propriedade do player — não existe setter assíncrono.
    // eslint-disable-next-line react-hooks/immutability
    player.playbackRate = next;
    setRate(next);
  }, [rate, player]);

  const retry = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: null }));
    void fetchPlayer().then((next) => setState(next));
  }, [fetchPlayer]);

  if (!authLoading && !user) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <EmptyState
          icon="headset-outline"
          title="Entre para ouvir seus audiobooks."
          message="Seus e-books e audiobooks ficam na sua Cliffhanger Account — a mesma do site."
          actionLabel="Entrar"
          onAction={() => router.push("/account")}
        />
      </View>
    );
  }

  if (authLoading || state.loading) {
    return <Loading label="Abrindo o player…" />;
  }

  if (state.error || !file || !state.item) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <EmptyState
          icon="alert-circle-outline"
          title={state.error ?? "Áudio indisponível."}
          actionLabel="Tentar novamente"
          onAction={retry}
        />
      </View>
    );
  }

  const duration = status.duration > 0 ? status.duration : 0;
  const current = duration > 0 ? Math.min(status.currentTime, duration) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* cabeçalho: volta + título */}
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
        <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: Colors.accent }} />
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontFamily: Fonts.display,
            fontSize: 18,
            letterSpacing: 1,
            color: Colors.text,
          }}
        >
          {state.item.title.toUpperCase()}
        </Text>
      </View>

      <View
        style={{
          flex: 1,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 24,
          justifyContent: "center",
          gap: 20,
        }}
      >
        {/* capa */}
        <View
          style={{
            width: 200,
            maxWidth: "70%",
            aspectRatio: 2 / 3,
            alignSelf: "center",
            borderRadius: Radius.md,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: Colors.border,
            backgroundColor: Colors.surface,
          }}
        >
          {state.item.image ? (
            <Image
              source={{ uri: state.item.image }}
              contentFit="cover"
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <BookCover title={state.item.title} />
          )}
        </View>

        {/* painel dos controles */}
        <View
          style={{
            padding: 20,
            borderRadius: Radius.lg,
            backgroundColor: Colors.surface,
            borderWidth: 1,
            borderColor: Colors.border,
            gap: 18,
          }}
        >
          {/* barra + tempos */}
          <View>
            <SeekBar position={current} duration={duration} onSeek={seekToSeconds} />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: -4,
              }}
            >
              <Text style={{ fontFamily: Fonts.bodyMedium, fontSize: 12, color: Colors.accent }}>
                {formatTime(current)}
              </Text>
              <Text style={{ fontFamily: Fonts.bodyMedium, fontSize: 12, color: Colors.textFaint }}>
                {duration > 0 ? formatTime(duration) : "--:--"}
              </Text>
            </View>
          </View>

          {duration <= 0 ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <ActivityIndicator color={Colors.accent} size="small" />
              <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted }}>
                Carregando o áudio…
              </Text>
            </View>
          ) : null}

          {/* controles */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 30,
            }}
          >
            <ControlButton
              icon="play-skip-back"
              label="Voltar 15 segundos"
              onPress={() => skip(-15)}
            />
            <Pressable
              onPress={togglePlay}
              accessibilityLabel={status.playing ? "Pausar" : "Reproduzir"}
              style={({ pressed }) => [
                {
                  width: 78,
                  height: 78,
                  borderRadius: 39,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: Colors.accent,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Ionicons
                name={status.playing ? "pause" : "play"}
                size={34}
                color={Colors.onAccent}
                style={status.playing ? undefined : { marginLeft: 4 }}
              />
            </Pressable>
            <ControlButton
              icon="play-skip-forward"
              label="Avançar 15 segundos"
              onPress={() => skip(15)}
            />
          </View>

          {/* velocidade */}
          <Pressable
            onPress={cycleRate}
            accessibilityLabel={`Velocidade ${String(rate).replace(".", ",")} vezes`}
            style={({ pressed }) => [
              {
                alignSelf: "center",
                height: 38,
                paddingHorizontal: 18,
                borderRadius: Radius.pill,
                borderWidth: 1,
                borderColor: Colors.border,
                backgroundColor: Colors.surfaceAlt,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text
              style={{ fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.accent }}
            >
              {`${String(rate).replace(".", ",")}×`}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

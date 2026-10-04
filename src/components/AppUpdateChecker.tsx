/**
 * Gate de auto-atualização (Etapa N): checa o manifesto no mount e ao voltar
 * pro primeiro plano; havendo versão nova, abre um diálogo P4 que baixa o APK
 * com progresso e dispara o instalador do Android — com fallback pelo
 * navegador. "Depois" adia até a próxima abertura (sessão).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Modal, Platform, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Colors, Fonts, Radius, Spacing, useThemeColors } from "@/constants/theme";
import {
  type AppVersionManifest,
  downloadApk,
  fetchLatestVersion,
  formatSizeMb,
  hasNewerVersion,
  openApkInBrowser,
  openInstaller,
} from "@/lib/appUpdate";

type Phase = "hidden" | "available" | "downloading" | "installing" | "error";

/** Intervalo mínimo entre checagens (evita spam ao alternar de tela). */
const CHECK_INTERVAL_MS = 5 * 60_000;

export function AppUpdateChecker() {
  useThemeColors();

  const [phase, setPhase] = useState<Phase>("hidden");
  const [manifest, setManifest] = useState<AppVersionManifest | null>(null);
  const [progress, setProgress] = useState(0);

  const phaseRef = useRef<Phase>("hidden");
  const dismissedRef = useRef(false);
  const lastCheckRef = useRef(0);
  const cancelledRef = useRef(false);
  const cancelRef = useRef<(() => void) | null>(null);

  const go = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const check = useCallback(async () => {
    if (dismissedRef.current || phaseRef.current !== "hidden") return;
    const now = Date.now();
    if (now - lastCheckRef.current < CHECK_INTERVAL_MS) return;
    lastCheckRef.current = now;
    const latest = await fetchLatestVersion();
    if (!latest || !hasNewerVersion(latest)) return;
    if (dismissedRef.current || phaseRef.current !== "hidden") return;
    setManifest(latest);
    setProgress(0);
    go("available");
  }, [go]);

  useEffect(() => {
    void check();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });
    return () => sub.remove();
  }, [check]);

  const dismiss = useCallback(() => {
    dismissedRef.current = true;
    go("hidden");
  }, [go]);

  /** Baixa + instala (Android) ou manda pro navegador (web/iOS). */
  const startUpdate = useCallback(async () => {
    if (!manifest) return;
    if (Platform.OS !== "android") {
      try {
        await openApkInBrowser(manifest.apkUrl);
        go("hidden");
      } catch {
        go("error");
      }
      return;
    }
    cancelledRef.current = false;
    setProgress(0);
    go("downloading");
    try {
      const file = await downloadApk(manifest, setProgress, (cancel) => {
        cancelRef.current = cancel;
      });
      cancelRef.current = null;
      go("installing");
      try {
        await openInstaller(file);
        // usuário voltou do instalador (instalou ou desistiu)
        go("hidden");
      } catch {
        // caminho nativo falhou → fallback: navegador baixa e instala
        try {
          await openApkInBrowser(manifest.apkUrl);
          go("hidden");
        } catch {
          go("error");
        }
      }
    } catch {
      cancelRef.current = null;
      if (cancelledRef.current) {
        go("available");
      } else {
        go("error");
      }
    }
  }, [go, manifest]);

  const cancelDownload = useCallback(() => {
    cancelledRef.current = true;
    cancelRef.current?.();
  }, []);

  const browserFallback = useCallback(async () => {
    if (!manifest) return;
    try {
      await openApkInBrowser(manifest.apkUrl);
      go("hidden");
    } catch {
      go("error");
    }
  }, [go, manifest]);

  if (!manifest) return null;
  const size = formatSizeMb(manifest.sizeBytes);
  const pct = Math.round(progress * 100);

  return (
    <Modal
      visible={phase !== "hidden"}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(14, 0, 0, 0.78)",
          alignItems: "center",
          justifyContent: "center",
          padding: Spacing.xl,
        }}
      >
        <View
          testID="update-dialog"
          accessibilityRole="alert"
          style={{
            width: "100%",
            maxWidth: 420,
            backgroundColor: Colors.surface,
            borderRadius: Radius.lg,
            borderWidth: 1,
            borderColor: Colors.border,
            padding: Spacing.xl,
            gap: Spacing.lg,
          }}
        >
          <Text
            style={{
              fontFamily: Fonts.display,
              fontSize: 30,
              lineHeight: 34,
              color: Colors.text,
            }}
          >
            NOVA VERSÃO DISPONÍVEL
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
            <View
              style={{
                backgroundColor: Colors.surfaceAlt,
                borderRadius: Radius.pill,
                paddingHorizontal: 10,
                paddingVertical: 3,
              }}
            >
              <Text style={{ fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.accent }}>
                v{manifest.version}
              </Text>
            </View>
            {size ? (
              <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted }}>
                {size}
              </Text>
            ) : null}
          </View>

          {manifest.notes ? (
            <Text
              style={{
                fontFamily: Fonts.body,
                fontSize: 15,
                lineHeight: 21,
                color: Colors.textMuted,
              }}
            >
              {manifest.notes}
            </Text>
          ) : null}

          {phase === "downloading" ? (
            <View testID="update-progress" style={{ gap: Spacing.sm }}>
              <View
                style={{
                  height: 8,
                  borderRadius: Radius.pill,
                  backgroundColor: Colors.surfaceAlt,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${pct}%` as `${number}%`,
                    height: "100%",
                    backgroundColor: Colors.primary,
                  }}
                />
              </View>
              <Text
                style={{ fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.textMuted }}
              >
                Baixando… {pct}%
              </Text>
            </View>
          ) : null}

          {phase === "installing" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
              <ActivityIndicator size="small" color={Colors.accent} />
              <Text
                style={{ fontFamily: Fonts.bodyMedium, fontSize: 14, color: Colors.text }}
              >
                Abrindo o instalador…
              </Text>
            </View>
          ) : null}

          {phase === "error" ? (
            <Text
              style={{
                fontFamily: Fonts.body,
                fontSize: 14,
                lineHeight: 20,
                color: Colors.warning,
              }}
            >
              Não consegui baixar a atualização. Tente de novo ou abra pelo navegador.
            </Text>
          ) : null}

          <View style={{ gap: Spacing.sm }}>
            {phase === "available" ? (
              <>
                <Button label="Atualizar agora" onPress={() => void startUpdate()} />
                <Button label="Depois" variant="secondary" onPress={dismiss} />
              </>
            ) : null}

            {phase === "downloading" ? (
              <Button label="Cancelar download" variant="secondary" onPress={cancelDownload} />
            ) : null}

            {phase === "error" ? (
              <>
                <Button label="Tentar de novo" onPress={() => void startUpdate()} />
                <Button
                  label="Baixar pelo navegador"
                  variant="secondary"
                  onPress={() => void browserFallback()}
                />
                <View style={{ alignItems: "center" }}>
                  <Text
                    onPress={dismiss}
                    accessibilityRole="button"
                    style={{
                      fontFamily: Fonts.bodyMedium,
                      fontSize: 14,
                      color: Colors.textMuted,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                    }}
                  >
                    Fechar
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

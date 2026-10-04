/**
 * Auto-atualização do app (Etapa N): lê o manifesto público do site
 * (`app-version.json`) e, quando há uma versão mais nova que a instalada,
 * baixa o APK com progresso e abre o instalador do Android — com fallback
 * pelo navegador. Tudo é best-effort: falha de rede ou de formato
 * simplesmente não mostra nada.
 */
import * as Application from "expo-application";
import Constants from "expo-constants";
import { File, Paths } from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher";
import { Linking, Platform } from "react-native";

export interface AppVersionManifest {
  version: string;
  versionCode: number;
  platform: string;
  apkUrl: string;
  sizeBytes: number;
  releasedAt: string;
  notes: string;
}

const MANIFEST_URL = `${(process.env.EXPO_PUBLIC_STORE_URL ?? "").replace(/\/+$/, "")}/app-version.json`;
/** Intent.FLAG_GRANT_READ_URI_PERMISSION — dá leitura do content:// pro instalador. */
const FLAG_GRANT_READ = 0x00000001;

/**
 * versionCode "atual": no Android é o do binário instalado; fora dele
 * (web/gate) usa o valor explícito embutido no bundle (EXPO_PUBLIC_*), com
 * fallback pro app.json quando presente.
 */
export function getCurrentVersionCode(): number {
  if (Platform.OS === "android") {
    const native = Application.nativeBuildVersion;
    if (native != null && native !== "") {
      const parsed = Number(native);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  const env = process.env.EXPO_PUBLIC_APP_VERSION_CODE;
  if (env) {
    const parsed = Number(env);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  const cfg = Constants.expoConfig?.android?.versionCode;
  return typeof cfg === "number" ? cfg : 0;
}

/** Manifesto com cache-bust; `null` em falha de rede ou de formato. */
export async function fetchLatestVersion(): Promise<AppVersionManifest | null> {
  try {
    const resp = await fetch(`${MANIFEST_URL}?t=${Date.now()}`, {
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as Partial<AppVersionManifest>;
    if (
      typeof data.version !== "string" ||
      typeof data.versionCode !== "number" ||
      typeof data.apkUrl !== "string"
    ) {
      return null;
    }
    return data as AppVersionManifest;
  } catch {
    return null;
  }
}

/** Há versão mais nova que a instalada? */
export function hasNewerVersion(manifest: AppVersionManifest): boolean {
  return (
    Number.isFinite(manifest.versionCode) &&
    manifest.versionCode > getCurrentVersionCode()
  );
}

/**
 * Baixa o APK pro cache com progresso (0..1). `onTask` recebe um cancelador
 * para abortar no meio (botão "Cancelar download").
 */
export async function downloadApk(
  manifest: AppVersionManifest,
  onProgress: (fraction: number) => void,
  onTask?: (cancel: () => void) => void,
): Promise<File> {
  const target = new File(Paths.cache, `cliffhanger-update-${manifest.version}.apk`);
  if (target.exists) target.delete();
  const task = File.createDownloadTask(manifest.apkUrl, target, {
    onProgress: ({ bytesWritten, totalBytes }) => {
      if (totalBytes > 0) onProgress(Math.min(1, bytesWritten / totalBytes));
    },
  });
  onTask?.(() => task.cancel());
  const file = await task.downloadAsync();
  if (!file) throw new Error("download interrompido");
  return file;
}

/** Abre o instalador nativo (content:// do FileProvider do expo-file-system). */
export async function openInstaller(file: File): Promise<void> {
  await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
    data: file.contentUri,
    type: "application/vnd.android.package-archive",
    flags: FLAG_GRANT_READ,
  });
}

/** Fallback: o navegador baixa o APK e oferece a instalação. */
export async function openApkInBrowser(apkUrl: string): Promise<void> {
  await Linking.openURL(apkUrl);
}

/** 123277728 → "117,6 MB" (string vazia se o tamanho não vier). */
export function formatSizeMb(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return "";
  return `${(sizeBytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

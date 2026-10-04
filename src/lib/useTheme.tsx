/**
 * Aparência do app — claro/escuro na paleta P4, sem "auto".
 *
 * O visitante nasce no ESCURO; a escolha fica em `cliffhanger:appearance`
 * (AsyncStorage) e vale para as próximas aberturas. O Provider carrega a
 * preferência antes de liberar a UI (`ready`) para não piscar o tema errado,
 * e também espelha o fundo do DOM no web (mesmo comportamento do site).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  Colors,
  getThemeMode,
  setThemeMode,
  subscribeTheme,
  useThemeColors,
  type ThemeMode,
} from "@/constants/theme";

const APPEARANCE_KEY = "cliffhanger:appearance";

interface ThemeContextValue {
  mode: ThemeMode;
  /** true quando a preferência salva já foi lida (anti-flash) */
  ready: boolean;
  setMode: (next: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "dark",
  ready: false,
  setMode: () => {
    /* contexto padrão fora do Provider */
  },
});

/** Espelha o fundo no DOM (web) — no nativo quem pinta é o Stack. */
function syncDocumentBackground(): void {
  if (typeof document === "undefined") return;
  const bg = Colors.background;
  document.documentElement.style.background = bg;
  document.body.style.background = bg;
  const root = document.getElementById("root");
  if (root) root.style.background = bg;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = useSyncExternalStore(subscribeTheme, getThemeMode, getThemeMode);
  const [ready, setReady] = useState(false);

  /* carrega a preferência salva antes de liberar a UI */
  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(APPEARANCE_KEY)
      .then((saved) => {
        if (alive && (saved === "dark" || saved === "light")) setThemeMode(saved);
      })
      .catch(() => {
        /* sem preferência: fica no escuro (padrão) */
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  /* fundo do DOM acompanha o modo (web) */
  useEffect(() => {
    syncDocumentBackground();
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setThemeMode(next);
    void AsyncStorage.setItem(APPEARANCE_KEY, next).catch(() => {
      /* melhor esforço — no pior caso vale só nesta sessão */
    });
  }, []);

  const value = useMemo(() => ({ mode, ready, setMode }), [mode, ready, setMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** mode + ready + setMode — para o gate raiz e a tela de Aparência. */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/** Re-export do assinante de cores (mesma store) p/ import direto daqui. */
export { useThemeColors };

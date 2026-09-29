/**
 * Sessão única Firebase (Documento Mestre §7/§37): o mesmo login da loja web.
 * - inicializa a escuta de sessão;
 * - sincroniza a wishlist local ↔ users/{uid}.wishlist (como o site faz);
 * - expõe entrar/criar conta/recuperar senha/sair com mensagens em pt-BR.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { auth } from "./auth";
import { firebaseEnabled } from "./firebase";
import { readWishlist, writeWishlist } from "./wishlist";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
}

export type AuthResult = { ok: true } | { ok: false; error: string };

interface AuthContextValue {
  /** usuário da sessão (null = visitante) */
  user: AuthUser | null;
  /** aguardando a primeira leitura de sessão */
  loading: boolean;
  /** operação de auth em andamento (botões de envio) */
  busy: boolean;
  /** wishlist (local + remota) */
  wishlist: string[];
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  logOut: () => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
  /** ID token da sessão para as APIs autenticadas (Bearer) */
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const WISHLIST_KEY = "cliffhanger:wishlist";

function mapAuthError(code: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "E-mail ou senha incorretos.";
    case "auth/email-already-in-use":
      return "Já existe uma conta com este e-mail.";
    case "auth/invalid-email":
      return "E-mail inválido.";
    case "auth/weak-password":
      return "Senha muito fraca — use pelo menos 6 caracteres.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Aguarde um pouco e tente novamente.";
    case "auth/network-request-failed":
      return "Sem conexão. Verifique sua internet.";
    case "auth/user-disabled":
      return "Esta conta foi desativada.";
    default:
      return "Não foi possível concluir. Tente novamente.";
  }
}

function toAuthUser(user: {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
}): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    emailVerified: user.emailVerified,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(() => auth === null);
  const [busy, setBusy] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const syncRef = useRef<string | null>(null);
  // resolve quando a wishlist local termina de carregar — a sincronização remota
  // espera esse gate para nunca sobrescrever o local ainda não lido (corrida
  // login/ montagem que apagava o wishlist do visitante).
  const localReadyRef = useRef<Promise<void>>(Promise.resolve());
  // espelho síncrono dos ids locais — escrito no load/toggle/sync para que a
  // sincronização NUNCA dependa da execução diferida do updater do React
  // (ler `merged` logo após setWishlist gravava o [] inicial por cima).
  const localIdsRef = useRef<string[]>([]);

  // wishlist local (visitante) — lida uma vez na montagem
  useEffect(() => {
    localReadyRef.current = AsyncStorage.getItem(WISHLIST_KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const ids = parsed.filter((v): v is string => typeof v === "string");
            localIdsRef.current = ids;
            setWishlist(ids);
          }
        } catch {
          /* storage corrompido — segue vazio */
        }
      })
      .catch(() => {
        /* storage indisponível — segue vazio */
      });
  }, []);

  const persistLocal = useCallback((ids: string[]) => {
    void AsyncStorage.setItem(WISHLIST_KEY, JSON.stringify(ids)).catch(() => {
      /* melhor esforço */
    });
  }, []);

  // sincroniza wishlist local ↔ remota (mesmo fluxo do Providers.tsx da loja)
  const syncWishlist = useCallback(
    async (u: AuthUser) => {
      if (syncRef.current === u.uid) return;
      syncRef.current = u.uid;
      try {
        // espera o carregamento local: sem isso, uma falha remota (rede/regras)
        // chegaria primeiro com [] e apagaria o wishlist do visitante.
        await localReadyRef.current;
        const remote = await readWishlist(u.uid);
        // computa o merge FORA do updater: valor determinístico para persistir.
        const merged = Array.from(new Set([...localIdsRef.current, ...remote]));
        localIdsRef.current = merged;
        setWishlist(merged);
        persistLocal(merged);
        await writeWishlist(u.uid, merged, { email: u.email, displayName: u.displayName });
      } catch {
        /* melhor esforço — estado local segue válido */
      }
    },
    [persistLocal],
  );

  // sessão
  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => {
      const next = u ? toAuthUser(u) : null;
      setUser(next);
      setLoading(false);
      if (next) {
        void syncWishlist(next);
      } else {
        syncRef.current = null;
      }
    });
  }, [syncWishlist]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!auth) return { ok: false, error: "Login indisponível — configure o .env do app." };
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: mapAuthError((e as { code?: string }).code ?? "") };
    } finally {
      setBusy(false);
    }
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string): Promise<AuthResult> => {
      if (!auth) return { ok: false, error: "Login indisponível — configure o .env do app." };
      setBusy(true);
      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const trimmed = name.trim();
        if (trimmed && cred.user) {
          await updateProfile(cred.user, { displayName: trimmed });
        }
        return { ok: true };
      } catch (e) {
        return { ok: false, error: mapAuthError((e as { code?: string }).code ?? "") };
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    if (!auth) return { ok: false, error: "Login indisponível — configure o .env do app." };
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { ok: true };
    } catch (e) {
      return { ok: false, error: mapAuthError((e as { code?: string }).code ?? "") };
    } finally {
      setBusy(false);
    }
  }, []);

  const logOut = useCallback(async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch {
      /* sessão já encerrada */
    }
  }, []);

  const toggleWishlist = useCallback(
    async (productId: string) => {
      let next: string[] = [];
      setWishlist((current) => {
        next = current.includes(productId)
          ? current.filter((id) => id !== productId)
          : [...current, productId];
        localIdsRef.current = next;
        persistLocal(next);
        if (user) {
          void writeWishlist(user.uid, next, {
            email: user.email,
            displayName: user.displayName,
          });
        }
        return next;
      });
    },
    [persistLocal, user],
  );

  const getIdToken = useCallback(async (): Promise<string | null> => {
    if (!auth?.currentUser) return null;
    try {
      return await auth.currentUser.getIdToken();
    } catch {
      return null;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading: loading && firebaseEnabled,
      busy,
      wishlist,
      signIn,
      signUp,
      resetPassword,
      logOut,
      toggleWishlist,
      getIdToken,
    }),
    [
      user,
      loading,
      busy,
      wishlist,
      signIn,
      signUp,
      resetPassword,
      logOut,
      toggleWishlist,
      getIdToken,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}

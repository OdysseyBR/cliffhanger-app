/**
 * Sessão única Firebase (Documento Mestre §7/§37): o mesmo login da loja web.
 * - inicializa a escuta de sessão;
 * - sincroniza a wishlist local ↔ users/{uid}.wishlist (como o site faz);
 * - expõe entrar/criar conta/recuperar senha/sair com mensagens em pt-BR.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
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
import { ApiError, deleteAccount as deleteAccountApi } from "./api";
import {
  leaveSession as leaveDeviceSession,
  registerSession as registerDeviceSession,
  resetSessionClock,
  revokeSessions as revokeDeviceSessions,
} from "./device";
import { firebaseEnabled } from "./firebase";
import { removePushToken } from "./notificationsStore";
import { readWishlist, writeWishlist } from "./wishlist";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  /** provedores vinculados: password, google.com, facebook.com… */
  providers: string[];
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
  /** login Google nativo (Etapa D): consuma o id_token do AuthSession */
  googleLogin: (idToken: string) => Promise<AuthResult>;
  /** login Google na web (Etapa D): popup, mesmo fluxo da loja */
  googlePopup: () => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  logOut: () => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
  /** ID token da sessão para as APIs autenticadas (Bearer) */
  getIdToken: () => Promise<string | null>;
  /** segurança (Etapa C): altera senha com reautenticação inline */
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthResult>;
  /** reenvia o e-mail de verificação */
  verifyEmail: () => Promise<AuthResult>;
  /** encerra as sessões de todos os dispositivos (9.5) */
  revokeSessions: () => Promise<AuthResult>;
  /** exclusão completa da conta: reauth + API + limpeza local (LGPD §10) */
  deleteAccount: (currentPassword: string) => Promise<AuthResult>;
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
    case "auth/requires-recent-login":
      return "Confirme sua identidade: informe sua senha novamente.";
    case "auth/account-exists-with-different-credential":
      return "Já existe uma conta com este e-mail — entre com e-mail e senha.";
    case "auth/unauthorized-domain":
      return "Login Google indisponível neste endereço.";
    case "auth/popup-blocked":
      return "O navegador bloqueou a janela de login — permita pop-ups.";
    case "auth/cancelled-popup-request":
    case "auth/popup-closed-by-user":
      return ""; // cancelado pelo usuário — sem banner
    default:
      return "Não foi possível concluir. Tente novamente.";
  }
}

function toAuthUser(user: {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  providerData: readonly { providerId: string }[];
}): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    emailVerified: user.emailVerified,
    providers: user.providerData.map((provider) => provider.providerId),
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
        // registra este dispositivo no registry de sessões (throttle 5 min)
        u?.getIdToken()
          .then((token) => registerDeviceSession(token))
          .catch(() => undefined);
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

  /** Login com Google no app nativo (Etapa D) — id_token do AuthSession → Firebase. */
  const googleLogin = useCallback(async (idToken: string): Promise<AuthResult> => {
    if (!auth) return { ok: false, error: "Login indisponível — configure o .env do app." };
    if (!idToken) return { ok: false, error: "Não foi possível concluir. Tente novamente." };
    setBusy(true);
    try {
      await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: mapAuthError((e as { code?: string }).code ?? "") };
    } finally {
      setBusy(false);
    }
  }, []);

  /** Login com Google na web (preview) — popup, igual ao site. */
  const googlePopup = useCallback(async (): Promise<AuthResult> => {
    if (!auth) return { ok: false, error: "Login indisponível — configure o .env do app." };
    setBusy(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
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
        // verificação automática no cadastro (Etapa C) — melhor esforço: se o
        // envio falhar, o botão "Verificar e-mail agora" cobre o caso
        try {
          await sendEmailVerification(cred.user);
        } catch {
          /* sem e-mail agora — usuário pode reenviar depois */
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
      const current = auth.currentUser;
      if (current) {
        // remove o token push deste dispositivo ANTES de encerrar a sessão
        // (a escrita no Firestore precisa do usuário ainda autenticado)
        await removePushToken(current.uid);
        // apaga este dispositivo do registry de sessões (best-effort)
        try {
          const token = await current.getIdToken();
          await leaveDeviceSession(token);
        } catch {
          /* melhor esforço — o registro envelhece sozinho */
        }
      }
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

  /** Altera a senha SEMPRE reautenticando antes (Etapa C — inline). */
  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<AuthResult> => {
      const current = auth?.currentUser;
      if (!current) return { ok: false, error: "Nenhuma sessão ativa." };
      if (!current.email) {
        return { ok: false, error: "Esta conta não usa senha — entre pelo Google/Facebook." };
      }
      if (!currentPassword) return { ok: false, error: "Informe sua senha atual." };
      if (newPassword.length < 6) {
        return { ok: false, error: "A nova senha precisa de pelo menos 6 caracteres." };
      }
      setBusy(true);
      try {
        await reauthenticateWithCredential(
          current,
          EmailAuthProvider.credential(current.email, currentPassword),
        );
        await updatePassword(current, newPassword);
        return { ok: true };
      } catch (e) {
        const code = (e as { code?: string }).code ?? "";
        if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
          return { ok: false, error: "Senha atual incorreta." };
        }
        return { ok: false, error: mapAuthError(code) };
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  /** Reenvia o e-mail de verificação (extra da Etapa C). */
  const verifyEmail = useCallback(async (): Promise<AuthResult> => {
    const current = auth?.currentUser;
    if (!current) return { ok: false, error: "Nenhuma sessão ativa." };
    setBusy(true);
    try {
      await sendEmailVerification(current);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: mapAuthError((e as { code?: string }).code ?? "") };
    } finally {
      setBusy(false);
    }
  }, []);

  /** Revoga os refresh tokens de todos os dispositivos (9.5) e sai aqui. */
  const revokeSessions = useCallback(async (): Promise<AuthResult> => {
    const current = auth?.currentUser;
    if (!auth || !current) return { ok: false, error: "Nenhuma sessão ativa." };
    setBusy(true);
    try {
      const token = await current.getIdToken();
      await revokeDeviceSessions(token);
      // o token deste dispositivo também foi revogado — sai por aqui
      await removePushToken(current.uid);
      await signOut(auth);
      return { ok: true };
    } catch (e) {
      if (e instanceof ApiError) return { ok: false, error: e.message };
      return { ok: false, error: mapAuthError((e as { code?: string }).code ?? "") };
    } finally {
      setBusy(false);
    }
  }, []);

  /**
   * Exclusão completa (LGPD §10): reautenticação obrigatória → remove o token
   * push (senão users/{uid} seria recriado depois) → DELETE /api/account no
   * backend (Firestore + Auth + adminUsers) → espelhos locais → signOut.
   */
  const deleteAccount = useCallback(
    async (currentPassword: string): Promise<AuthResult> => {
      const current = auth?.currentUser;
      if (!auth || !current) return { ok: false, error: "Nenhuma sessão ativa." };
      const hasPassword = current.providerData.some(
        (provider) => provider.providerId === "password",
      );
      if (!hasPassword || !current.email) {
        return {
          ok: false,
          error: "Esta conta não usa senha — exclua pela loja no navegador.",
        };
      }
      if (!currentPassword) return { ok: false, error: "Informe sua senha atual." };
      setBusy(true);
      try {
        // 1) reautenticação sempre exigida antes de destruir a conta
        await reauthenticateWithCredential(
          current,
          EmailAuthProvider.credential(current.email, currentPassword),
        );
        const idToken = await current.getIdToken();
        // 2) token push local/remoto enquanto users/{uid} ainda existe
        await removePushToken(current.uid);
        // 3) exclusão completa no backend (idempotente)
        await deleteAccountApi(idToken);
        // 4) espelhos locais — sessão encerra via onAuthStateChanged
        localIdsRef.current = [];
        setWishlist([]);
        persistLocal([]);
        await resetSessionClock();
        await signOut(auth);
        return { ok: true };
      } catch (e) {
        const code = (e as { code?: string }).code ?? "";
        if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
          return { ok: false, error: "Senha atual incorreta." };
        }
        if (e instanceof ApiError) return { ok: false, error: e.message };
        return { ok: false, error: mapAuthError(code) };
      } finally {
        setBusy(false);
      }
    },
    [persistLocal],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading: loading && firebaseEnabled,
      busy,
      wishlist,
      signIn,
      signUp,
      googleLogin,
      googlePopup,
      resetPassword,
      logOut,
      toggleWishlist,
      getIdToken,
      changePassword,
      verifyEmail,
      revokeSessions,
      deleteAccount,
    }),
    [
      user,
      loading,
      busy,
      wishlist,
      signIn,
      signUp,
      googleLogin,
      googlePopup,
      resetPassword,
      logOut,
      toggleWishlist,
      getIdToken,
      changePassword,
      verifyEmail,
      revokeSessions,
      deleteAccount,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}

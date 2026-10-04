/**
 * Segurança (Etapa C — Doc Mestre 9.5/§10): alterar senha com reautenticação
 * inline, verificar e-mail, lista de dispositivos registrados na loja
 * (registry `users/{uid}/sessions`), encerrar todas as sessões e exclusão
 * completa da conta com confirmação explícita.
 */
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Field } from "@/components/Field";
import { Loading, Screen } from "@/components/Screen";
import { Colors, Fonts, Radius, ScreenPadding, useThemeColors } from "@/constants/theme";
import { deviceLabel, getSid, loadSessions, type AccountSession } from "@/lib/device";
import { useAuth } from "@/lib/useAuth";
import { useCart } from "@/lib/useCart";

/** Vermelho de perigo (mesmo #E5484D do card de exclusão do site). */
const DANGER = "#E5484D";

interface Notice {
  ok: boolean;
  text: string;
}

/** Lê as sessões do usuário — sem setState aqui (só o efeito grava). */
async function fetchSessionsForUser(
  getIdToken: () => Promise<string | null>,
): Promise<AccountSession[] | null> {
  const token = await getIdToken();
  return token ? await loadSessions(token) : null;
}

/** "agora" / "há 5 min" / "há 2 h" / "ontem" / data por extenso. */
function formatLastSeen(iso: string): string {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return "";
  const diff = Date.now() - time;
  if (diff < 60_000) return "agora";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  return new Date(time).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function SecurityScreen() {
  useThemeColors();
  const styles = useStyles();
  const {
    user,
    loading: authLoading,
    busy,
    changePassword,
    verifyEmail,
    revokeSessions,
    deleteAccount,
    getIdToken,
  } = useAuth();
  const { clear: clearCart } = useCart();

  const [notice, setNotice] = useState<Notice | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // undefined = carregando, null = API indisponível (503/offline)
  const [sessions, setSessions] = useState<AccountSession[] | null | undefined>(undefined);
  const [sid, setSid] = useState("");

  useEffect(() => {
    if (!user) return;
    // padrão das telas do app: setState sempre dentro do callback do .then
    void fetchSessionsForUser(getIdToken).then(setSessions);
    void getSid()
      .then(setSid)
      .catch(() => undefined);
  }, [user, getIdToken]);

  const submitPassword = async () => {
    setNotice(null);
    if (!currentPassword || !newPassword) {
      setNotice({ ok: false, text: "Preencha a senha atual e a nova." });
      return;
    }
    if (newPassword.length < 6) {
      setNotice({ ok: false, text: "A nova senha precisa de pelo menos 6 caracteres." });
      return;
    }
    const result = await changePassword(currentPassword, newPassword);
    setNotice(
      result.ok
        ? { ok: true, text: "Senha alterada com sucesso." }
        : { ok: false, text: result.error },
    );
    if (result.ok) {
      setCurrentPassword("");
      setNewPassword("");
    }
  };

  const runVerify = async () => {
    setNotice(null);
    const result = await verifyEmail();
    setNotice(
      result.ok
        ? { ok: true, text: "Enviamos o link de verificação para o seu e-mail." }
        : { ok: false, text: result.error },
    );
  };

  const runRevoke = async () => {
    setNotice(null);
    const result = await revokeSessions();
    if (result.ok) {
      router.replace("/account");
      return;
    }
    setNotice({ ok: false, text: result.error });
  };

  const runDelete = async () => {
    setNotice(null);
    const result = await deleteAccount(deletePassword);
    if (result.ok) {
      // espelhos locais já limpos no hook — carrinho também sai daqui
      clearCart();
      setConfirmingDelete(false);
      setDeletePassword("");
      router.replace("/account");
      return;
    }
    setNotice({ ok: false, text: result.error });
  };

  if (authLoading) {
    return <Loading label="Verificando sua sessão…" />;
  }
  if (!user) {
    return (
      <Screen title="Segurança" scroll={false}>
        <EmptyState
          icon="shield-checkmark-outline"
          title="Entre para ativar."
          message="Senha, e-mail, sessões e exclusão da conta ficam na sua conta Cliffhanger."
          actionLabel="Entrar"
          onAction={() => router.push("/account")}
        />
      </Screen>
    );
  }

  return (
    <Screen title="Segurança">
      <View style={{ paddingTop: 16, paddingHorizontal: ScreenPadding, gap: 14 }}>
        {notice ? (
          <View
            style={[
              styles.banner,
              { borderColor: notice.ok ? Colors.accent : DANGER },
            ]}
          >
            <Ionicons
              name={notice.ok ? "checkmark-circle" : "alert-circle-outline"}
              size={18}
              color={notice.ok ? Colors.accent : DANGER}
            />
            <Text style={styles.bannerText}>{notice.text}</Text>
          </View>
        ) : null}

        {/* alterar senha (reautenticação inline) */}
        <SectionBlock title="Alterar senha">
          {user.providers.includes("password") ? (
            <View style={styles.card}>
              <Field
                label="Senha atual"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Sua senha atual"
                secure
                autoCapitalize="none"
                autoComplete="password"
              />
              <Field
                label="Nova senha"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Mínimo de 6 caracteres"
                secure
                autoCapitalize="none"
                autoComplete="password"
              />
              <Button
                label="Alterar senha"
                loading={busy}
                onPress={() => void submitPassword()}
              />
              <Text style={styles.hint}>
                Confirmamos sua senha atual antes de alterar — é a reautenticação exigida pelo
                Firebase.
              </Text>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.muted}>
                Esta conta não usa senha — entre pelos métodos vinculados na loja.
              </Text>
            </View>
          )}
        </SectionBlock>

        {/* e-mail */}
        <SectionBlock title="E-mail">
          <View style={styles.card}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons
                name={user.emailVerified ? "checkmark-circle" : "alert-circle-outline"}
                size={16}
                color={user.emailVerified ? Colors.accent : DANGER}
              />
              <Text numberOfLines={1} style={styles.rowText}>
                {user.email}
              </Text>
            </View>
            <Text style={styles.hint}>
              {user.emailVerified
                ? "E-mail verificado."
                : "E-mail não verificado — verifique para garantir o acesso à sua conta."}
            </Text>
            {user.emailVerified ? null : (
              <Button
                label="Verificar e-mail agora"
                variant="secondary"
                loading={busy}
                onPress={() => void runVerify()}
              />
            )}
          </View>
        </SectionBlock>

        {/* dispositivos e sessões */}
        <SectionBlock title="Dispositivos e sessões">
          <View style={styles.card}>
            {sessions === undefined ? (
              <Text style={styles.muted}>Carregando sessões…</Text>
            ) : sessions === null ? (
              <Text style={styles.muted}>
                Histórico de sessões indisponível neste momento — este é o dispositivo atual.
              </Text>
            ) : (
              <SessionList sessions={sessions} sid={sid} fallback={deviceLabel()} />
            )}
            <Text style={styles.hint}>
              Encerrar as sessões invalida os acessos em todos os dispositivos (inclusive este) —
              o Firebase não permite derrubar um dispositivo só.
            </Text>
            <Button
              label="Sair de todos os dispositivos"
              variant="secondary"
              loading={busy}
              onPress={() => void runRevoke()}
            />
          </View>
        </SectionBlock>

        {/* exclusão da conta */}
        <SectionBlock title="Excluir conta">
          <View style={[styles.card, { borderColor: `${DANGER}66` }]}>
            <Text style={styles.hint}>
              Remove perfil, endereços, biblioteca vinculada, wishlist e a assinatura
              Cliffhanger+ (benefícios temporários e Drops encerram junto; itens permanentes já
              resgatados saem da biblioteca). Os pedidos já feitos são mantidos sem dono para
              fins fiscais e de histórico.
            </Text>
            {!confirmingDelete ? (
              <Button
                label="Excluir conta"
                variant="secondary"
                disabled={busy}
                onPress={() => setConfirmingDelete(true)}
                style={{ borderColor: DANGER }}
              />
            ) : (
              <View style={{ gap: 10 }}>
                <Text style={styles.dangerTitle}>Confirmar exclusão permanente</Text>
                <Text style={styles.muted}>
                  Esta ação não pode ser desfeita. Digite sua senha atual para confirmar sua
                  identidade.
                </Text>
                <Field
                  label="Senha atual"
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  placeholder="Senha atual"
                  secure
                  autoCapitalize="none"
                  autoComplete="password"
                />
                <Button
                  label="Sim, excluir minha conta"
                  variant="secondary"
                  loading={busy}
                  disabled={deletePassword.length === 0}
                  onPress={() => void runDelete()}
                  style={{ borderColor: DANGER }}
                />
                <Button
                  label="Cancelar"
                  variant="secondary"
                  disabled={busy}
                  onPress={() => {
                    setConfirmingDelete(false);
                    setDeletePassword("");
                  }}
                />
              </View>
            )}
          </View>
        </SectionBlock>
      </View>
    </Screen>
  );
}

/** Lista de sessões: atual em destaque + as demais com IP e último acesso. */
function SessionList({
  sessions,
  sid,
  fallback,
}: {
  sessions: AccountSession[];
  sid: string;
  fallback: string;
}) {
  const styles = useStyles();
  const current = sessions.find((session) => session.sid === sid);
  const others = sessions.filter((session) => session.sid !== sid);
  return (
    <View style={{ gap: 10 }}>
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <View
            style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent }}
          />
          <Text style={styles.rowText}>{current?.device || fallback}</Text>
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>ESTE DISPOSITIVO</Text>
          </View>
        </View>
        <Text style={styles.hint}>
          {current?.ip ? `IP ${current.ip} · ` : ""}
          {formatLastSeen(current?.lastSeen ?? "") || "agora"}
        </Text>
      </View>
      {others.map((session) => (
        <View key={session.sid} style={{ gap: 2 }}>
          <Text style={styles.muted}>{session.device}</Text>
          <Text style={styles.hint}>
            {session.ip ? `IP ${session.ip} · ` : ""}
            {formatLastSeen(session.lastSeen) || "sem registro"}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Título de seção com barra de destaque (mesmo padrão das telas do app). */
function SectionBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: Colors.accent }} />
        <Text
          style={{
            fontFamily: Fonts.display,
            fontSize: 22,
            letterSpacing: 1.2,
            color: Colors.text,
          }}
        >
          {title.toUpperCase()}
        </Text>
      </View>
      {children}
    </View>
  );
}

/** Estilos vivos — recriados por render para lerem o Colors do modo ativo. */
function useStyles() {
  return StyleSheet.create({
    banner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 12,
      borderRadius: Radius.sm,
      backgroundColor: Colors.surface,
      borderWidth: 1,
    },
    bannerText: {
      flex: 1,
      fontFamily: Fonts.body,
      fontSize: 13,
      color: Colors.text,
    },
    card: {
      gap: 10,
      padding: 16,
      borderRadius: Radius.md,
      backgroundColor: Colors.surface,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    rowText: {
      flex: 1,
      fontFamily: Fonts.bodySemi,
      fontSize: 13.5,
      color: Colors.text,
    },
    hint: {
      fontFamily: Fonts.body,
      fontSize: 12,
      lineHeight: 17,
      color: Colors.textFaint,
    },
    muted: {
      fontFamily: Fonts.body,
      fontSize: 13,
      lineHeight: 18,
      color: Colors.textMuted,
    },
    dangerTitle: {
      fontFamily: Fonts.bodyBold,
      fontSize: 12,
      letterSpacing: 1,
      textTransform: "uppercase",
      color: DANGER,
    },
    currentBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: Colors.accent,
    },
    currentBadgeText: {
      fontFamily: Fonts.bodySemi,
      fontSize: 9.5,
      letterSpacing: 0.8,
      color: Colors.accent,
    },
  });
}

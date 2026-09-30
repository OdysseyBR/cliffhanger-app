/**
 * Conta — sessão única Firebase (Doc Mestre §7/§37). Visitante vê o formulário
 * entrar/criar conta/recuperar senha; na sessão, dados da conta + sair.
 */
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Loading, Screen } from "@/components/Screen";
import { Segmented } from "@/components/Segmented";
import { Wordmark } from "@/components/Wordmark";
import { Colors, Fonts, Radius, ScreenPadding } from "@/constants/theme";
import { useAuth } from "@/lib/useAuth";

type Mode = "entrar" | "criar";

export default function AccountScreen() {
  const { user, loading, busy, signIn, signUp, resetPassword, logOut, wishlist } = useAuth();

  const [mode, setMode] = useState<Mode>("entrar");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (loading) {
    return <Loading label="Verificando sua sessão…" />;
  }

  if (user) {
    const initial = (user.displayName ?? user.email ?? "?").trim().charAt(0).toUpperCase();
    return (
      <Screen contentStyle={{ paddingTop: 16 }}>
        <Text
          style={{
            paddingHorizontal: ScreenPadding,
            fontFamily: Fonts.display,
            fontSize: 26,
            letterSpacing: 1.4,
            color: Colors.text,
            marginBottom: 4,
          }}
        >
          CONTA
        </Text>
        <Text
          style={{
            paddingHorizontal: ScreenPadding,
            marginBottom: 18,
            fontFamily: Fonts.body,
            fontSize: 13.5,
            lineHeight: 19,
            color: Colors.textMuted,
          }}
        >
          Sua conta única — a mesma da loja Cliffhanger Store.
        </Text>

        <View style={{ paddingHorizontal: ScreenPadding, gap: 16 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              padding: 16,
              borderRadius: Radius.md,
              backgroundColor: Colors.surface,
              borderWidth: 1,
              borderColor: Colors.border,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: Colors.accent,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{ fontFamily: Fonts.display, fontSize: 26, color: Colors.onAccent }}
              >
                {initial}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                numberOfLines={1}
                style={{ fontFamily: Fonts.bodySemi, fontSize: 16, color: Colors.text }}
              >
                {user.displayName || "Conta Cliffhanger"}
              </Text>
              <Text
                numberOfLines={1}
                style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted }}
              >
                {user.email}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  alignSelf: "flex-start",
                  marginTop: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: Radius.pill,
                  borderWidth: 1,
                  borderColor: user.emailVerified ? Colors.border : Colors.warning,
                  backgroundColor: Colors.surface,
                }}
              >
                <Ionicons
                  name={user.emailVerified ? "checkmark-circle" : "alert-circle-outline"}
                  size={12}
                  color={user.emailVerified ? Colors.accent : Colors.warning}
                />
                <Text
                  style={{
                    fontFamily: Fonts.bodySemi,
                    fontSize: 10.5,
                    letterSpacing: 0.6,
                    color: user.emailVerified ? Colors.text : Colors.warning,
                  }}
                >
                  {user.emailVerified ? "E-mail verificado" : "E-mail não verificado"}
                </Text>
              </View>
            </View>
          </View>

          <InfoRow
            icon="heart-outline"
            label="Wishlist"
            value={`${wishlist.length} ${wishlist.length === 1 ? "item salvo" : "itens salvos"}`}
          />

          <SectionBlock title="Atalhos">
            <NavCard
              icon="receipt-outline"
              title="Meus pedidos"
              subtitle="Status das compras e histórico."
              onPress={() => router.push("/orders")}
            />
            <NavCard
              icon="notifications-outline"
              title="Notificações"
              subtitle="Avisos de pedidos, lançamentos e promoções."
              onPress={() => router.push("/notifications")}
            />
            <NavCard
              icon="library-outline"
              title="Minha biblioteca"
              subtitle="E-books e audiobooks com progresso."
              onPress={() => router.push("/library")}
            />
          </SectionBlock>

          <Button label="Sair da conta" variant="secondary" onPress={() => void logOut()} />
        </View>
      </Screen>
    );
  }

  const submit = async () => {
    setError(null);
    setNotice(null);
    if (!email.trim() || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }
    if (mode === "criar" && password.length < 6) {
      setError("A senha precisa de pelo menos 6 caracteres.");
      return;
    }
    const result =
      mode === "entrar" ? await signIn(email, password) : await signUp(name, email, password);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPassword("");
    if (mode === "criar") setName("");
  };

  const handleForgot = async () => {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError("Informe seu e-mail para recuperar a senha.");
      return;
    }
    const result = await resetPassword(email);
    if (result.ok) {
      setNotice("Enviamos um link de redefinição para o seu e-mail.");
    } else {
      setError(result.error);
    }
  };

  return (
    <Screen hideHeader contentStyle={{ paddingTop: 24 }}>
      <View style={{ alignSelf: "center", marginBottom: 14 }}>
        <Wordmark height={40} accessibilityLabel="Cliffhanger Store" />
      </View>
      <Text
        style={{
          paddingHorizontal: ScreenPadding,
          fontFamily: Fonts.display,
          fontSize: 26,
          letterSpacing: 1.4,
          color: Colors.text,
        }}
      >
        CONTA
      </Text>
      <Text
        style={{
          paddingHorizontal: ScreenPadding,
          marginTop: 4,
          marginBottom: 20,
          fontFamily: Fonts.body,
          fontSize: 13.5,
          lineHeight: 19,
          color: Colors.textMuted,
        }}
      >
        Entre ou crie sua conta — é a mesma da loja Cliffhanger Store.
      </Text>

      <View style={{ paddingHorizontal: ScreenPadding, gap: 14 }}>
        <Segmented<Mode>
          options={[
            { label: "Entrar", value: "entrar" },
            { label: "Criar conta", value: "criar" },
          ]}
          value={mode}
          onChange={(next) => {
            setMode(next);
            setError(null);
            setNotice(null);
          }}
        />

        {mode === "criar" ? (
          <Field
            label="Nome"
            value={name}
            onChangeText={setName}
            placeholder="Como você quer ser chamado"
            autoCapitalize="words"
            autoComplete="name"
          />
        ) : null}

        <Field
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          placeholder="voce@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <Field
          label="Senha"
          value={password}
          onChangeText={setPassword}
          placeholder="Mínimo de 6 caracteres"
          secure
          autoCapitalize="none"
          autoComplete={mode === "criar" ? "password" : "password"}
        />

        {error ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="alert-circle-outline" size={16} color={Colors.warning} />
            <Text style={{ flex: 1, fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.warning }}>
              {error}
            </Text>
          </View>
        ) : null}

        {notice ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              padding: 12,
              borderRadius: Radius.sm,
              backgroundColor: Colors.surface,
              borderWidth: 1,
              borderColor: Colors.border,
            }}
          >
            <Ionicons name="checkmark-circle" size={18} color={Colors.accent} />
            <Text style={{ flex: 1, fontFamily: Fonts.body, fontSize: 13, color: Colors.text }}>
              {notice}
            </Text>
          </View>
        ) : null}

        <Button
          label={mode === "entrar" ? "Entrar" : "Criar conta"}
          loading={busy}
          onPress={() => void submit()}
        />

        {mode === "entrar" ? (
          <Pressable onPress={() => void handleForgot()} hitSlop={8} style={{ alignSelf: "center" }}>
            <Text
              style={{
                fontFamily: Fonts.bodyMedium,
                fontSize: 13,
                color: Colors.accent,
                textDecorationLine: "underline",
              }}
            >
              Esqueci minha senha
            </Text>
          </Pressable>
        ) : null}

        <Text
          style={{
            fontFamily: Fonts.body,
            fontSize: 12,
            lineHeight: 17,
            color: Colors.textFaint,
            textAlign: "center",
            marginTop: 4,
          }}
        >
          Conta única: o mesmo e-mail e senha valem para a loja e para o app.
        </Text>
      </View>
    </Screen>
  );
}

/** Título de seção com barra de destaque (mesmo padrão do site/produto). */
function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
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

/** Cartão de atalho (navegação) — ícone amarelo, título, apoio e chevron. */
function NavCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          padding: 14,
          borderRadius: Radius.md,
          backgroundColor: Colors.surface,
          borderWidth: 1,
          borderColor: Colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={20} color={Colors.accent} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.text }}>
          {title}
        </Text>
        <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted }}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textFaint} />
    </Pressable>
  );
}

/** Linha de dado (stat) — ícone + rótulo à esquerda, valor à direita. */
function InfoRow({
  icon,
  label,
  value,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: Radius.md,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
        {icon ? <Ionicons name={icon} size={14} color={Colors.accent} /> : null}
        <Text
          style={{
            fontFamily: Fonts.bodyMedium,
            fontSize: 11,
            letterSpacing: 1.2,
            color: Colors.textFaint,
            textTransform: "uppercase",
          }}
        >
          {label}
        </Text>
      </View>
      <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.text, textAlign: "right" }}>
        {value}
      </Text>
    </View>
  );
}

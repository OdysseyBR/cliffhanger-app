/**
 * "Continuar com Google" (Etapa D — Doc Mestre §8, conta única).
 * - nativo (Android): AuthSession com o client ID OAuth tipo Android →
 *   id_token (PKCE + troca automática do expo-auth-session) →
 *   signInWithCredential do Firebase;
 * - web (preview): popup do Firebase — mesmo fluxo da loja.
 * Ícone "G" monocromático (Identidade — herdado do IconGoogleG do site).
 */
import type { AuthSessionResult } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { Path, Svg } from "react-native-svg";

import { Button } from "@/components/Button";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/lib/useAuth";

const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "";

/** scheme reverso do client ID — redirect canônico do Google para Android. */
function reverseScheme(): string {
  return CLIENT_ID.split(".").reverse().join(".");
}

interface GoogleButtonProps {
  /** reporta o erro para o banner compartilhado da tela */
  onError: (message: string) => void;
}

/** Google "G" — monocromático, 4 paths do logo (mesmo do site). */
function GoogleGlyph() {
  return (
    <Svg
      width={17}
      height={17}
      viewBox="0 0 48 48"
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Path
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        fill={Colors.text}
      />
      <Path
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        fill={Colors.text}
      />
      <Path
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        fill={Colors.text}
      />
      <Path
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        fill={Colors.text}
      />
    </Svg>
  );
}

/** Variante nativa: browser (Custom Tab) → redirect reverso → id_token. */
function NativeGoogleButton({ onError }: GoogleButtonProps) {
  const { googleLogin, busy } = useAuth();
  const [pending, setPending] = useState(false);
  const onErrorRef = useRef(onError);
  const seenRef = useRef<AuthSessionResult | null>(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: CLIENT_ID,
    selectAccount: true,
    // path "/account" de propósito: o expo-router recebe o Linking de retorno e
    // cai na própria tela de Conta (no-op) em vez de +not-found. Sondado no
    // Google: aceito para cliente Android com "custom URI scheme" habilitado.
    redirectUri: `${reverseScheme()}:/account`,
  });

  // mantém o callback mais recente sem reexecutar o efeito de resposta
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // processa o resultado do fluxo (id_token chega após a troca do código)
  useEffect(() => {
    if (!response || seenRef.current === response) return;
    seenRef.current = response;
    const finish = () => setPending(false);
    const run = async (): Promise<void> => {
      if (response.type === "success") {
        const result = await googleLogin(response.params.id_token ?? "");
        if (!result.ok && result.error) onErrorRef.current(result.error);
        return;
      }
      if (response.type === "error") {
        onErrorRef.current("Não foi possível concluir. Tente novamente.");
      }
      // cancel/dismiss → silêncio
    };
    void run().then(finish);
  }, [response, googleLogin]);

  const onPress = async () => {
    if (!request || pending || busy) return;
    setPending(true);
    try {
      await promptAsync();
    } catch {
      setPending(false);
      onErrorRef.current("Não foi possível concluir. Tente novamente.");
    }
  };

  return (
    <Button
      variant="secondary"
      icon={<GoogleGlyph />}
      label="Continuar com Google"
      loading={busy || pending}
      disabled={!request}
      onPress={() => void onPress()}
    />
  );
}

/** Variante web: popup do Firebase (preview/E2E — igual ao site). */
function WebGoogleButton({ onError }: GoogleButtonProps) {
  const { googlePopup, busy } = useAuth();
  return (
    <Button
      variant="secondary"
      icon={<GoogleGlyph />}
      label="Continuar com Google"
      loading={busy}
      onPress={() => {
        void googlePopup().then((result) => {
          if (!result.ok && result.error) onError(result.error);
        });
      }}
    />
  );
}

/** Build sem o client ID no env — botão explica em vez de quebrar. */
function GoogleButtonMissing({ onError }: GoogleButtonProps) {
  return (
    <Button
      variant="secondary"
      icon={<GoogleGlyph />}
      label="Continuar com Google"
      onPress={() => onError("Login Google não configurado neste build.")}
    />
  );
}

export function GoogleButton(props: GoogleButtonProps) {
  if (Platform.OS === "web") return <WebGoogleButton {...props} />;
  if (!CLIENT_ID) return <GoogleButtonMissing {...props} />;
  return <NativeGoogleButton {...props} />;
}

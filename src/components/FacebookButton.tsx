/**
 * "Continuar com Facebook" (Etapa E — Doc Mestre §8, conta única).
 * - nativo (Android): AuthSession com o esquema fb<APP_ID> → access_token
 *   (response_type=token, padrão do provider) → signInWithCredential;
 * - web (preview): popup do Firebase — mesmo fluxo da loja.
 * Ícone "f" monocromático (Identidade — herdado do IconFacebookF do site).
 */
import type { AuthSessionResult } from "expo-auth-session";
import * as Facebook from "expo-auth-session/providers/facebook";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { Path, Svg } from "react-native-svg";

import { Button } from "@/components/Button";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/lib/useAuth";

const APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? "";

interface FacebookButtonProps {
  /** reporta o erro para o banner compartilhado da tela */
  onError: (message: string) => void;
}

/** Facebook "f" — monocromático (mesmo do site). */
function FacebookGlyph() {
  return (
    <Svg
      width={17}
      height={17}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Path
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
        fill={Colors.text}
      />
    </Svg>
  );
}

/** Variante nativa: browser (Custom Tab) → redirect fb<APP_ID>://authorize → token. */
function NativeFacebookButton({ onError }: FacebookButtonProps) {
  const { facebookLogin, busy } = useAuth();
  const [pending, setPending] = useState(false);
  const onErrorRef = useRef(onError);
  const seenRef = useRef<AuthSessionResult | null>(null);

  // redirectUri é o padrão do provider: fb<APP_ID>://authorize (canônico do
  // Facebook para apps instalados — esquema escapa o App ID). O expo-router
  // recebe o Linking de retorno e extraiia a rota inexistente "authorize",
  // por isso o router.replace("/account") ao concluir o fluxo (abaixo).
  const [request, response, promptAsync] = Facebook.useAuthRequest({
    clientId: APP_ID,
  });

  // mantém o callback mais recente sem reexecutar o efeito de resposta
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // processa o resultado do fluxo (access_token chega no fragmento #)
  useEffect(() => {
    if (!response || seenRef.current === response) return;
    seenRef.current = response;
    const finish = () => setPending(false);
    const run = async (): Promise<void> => {
      if (response.type === "success" || response.type === "error") {
        // houve deep link de retorno: sai da "Unmatched Route" de volta para
        // a Conta antes de seguir — a Conta segue montada embaixo na pilha,
        // então o banner de erro posterior continua valendo.
        router.replace("/account");
      }
      if (response.type === "success") {
        const result = await facebookLogin(response.params.access_token ?? "");
        if (!result.ok && result.error) onErrorRef.current(result.error);
        return;
      }
      if (response.type === "error") {
        onErrorRef.current("Não foi possível concluir. Tente novamente.");
      }
      // cancel/dismiss → silêncio
    };
    void run().then(finish);
  }, [response, facebookLogin]);

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
      icon={<FacebookGlyph />}
      label="Continuar com Facebook"
      loading={busy || pending}
      disabled={!request}
      onPress={() => void onPress()}
    />
  );
}

/** Variante web: popup do Firebase (preview/E2E — igual ao site). */
function WebFacebookButton({ onError }: FacebookButtonProps) {
  const { facebookPopup, busy } = useAuth();
  return (
    <Button
      variant="secondary"
      icon={<FacebookGlyph />}
      label="Continuar com Facebook"
      loading={busy}
      onPress={() => {
        void facebookPopup().then((result) => {
          if (!result.ok && result.error) onError(result.error);
        });
      }}
    />
  );
}

/** Build sem o App ID no env — botão explica em vez de quebrar. */
function FacebookButtonMissing({ onError }: FacebookButtonProps) {
  return (
    <Button
      variant="secondary"
      icon={<FacebookGlyph />}
      label="Continuar com Facebook"
      onPress={() => onError("Login Facebook não configurado neste build.")}
    />
  );
}

export function FacebookButton(props: FacebookButtonProps) {
  if (Platform.OS === "web") return <WebFacebookButton {...props} />;
  if (!APP_ID) return <FacebookButtonMissing {...props} />;
  return <NativeFacebookButton {...props} />;
}

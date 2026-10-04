/**
 * Configurações › Aparência — seletor claro/escuro na paleta P4 (mesmo
 * caminho do site: Conta › Configurações › Preferências). Sem "auto":
 * ou escuro (padrão) ou claro; a escolha fica no aparelho.
 */
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { Segmented } from "@/components/Segmented";
import { Colors, Fonts, Radius, ScreenPadding, type ThemeMode } from "@/constants/theme";
import { useTheme } from "@/lib/useTheme";

export default function SettingsScreen() {
  const { mode, setMode } = useTheme();

  return (
    <Screen title="Configurações" contentStyle={{ paddingTop: 16 }}>
      <View style={{ paddingHorizontal: ScreenPadding, gap: 16 }}>
        <SectionBlock title="Aparência">
          <View
            style={{
              gap: 12,
              padding: 16,
              borderRadius: Radius.md,
              backgroundColor: Colors.surface,
              borderWidth: 1,
              borderColor: Colors.border,
            }}
          >
            <Segmented<ThemeMode>
              options={[
                { label: "Escuro (padrão)", value: "dark" },
                { label: "Claro", value: "light" },
              ]}
              value={mode}
              onChange={setMode}
            />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name={mode === "dark" ? "moon" : "sunny"} size={14} color={Colors.accent} />
              <Text
                style={{
                  flex: 1,
                  fontFamily: Fonts.body,
                  fontSize: 12,
                  lineHeight: 17,
                  color: Colors.textMuted,
                }}
              >
                {mode === "dark"
                  ? "Modo escuro (padrão) — a identidade Cliffhanger em fundo preto."
                  : "Modo claro — a mesma identidade em fundo areia claro."}
              </Text>
            </View>
          </View>
        </SectionBlock>
      </View>
    </Screen>
  );
}

/** Título de seção com barra de destaque (mesmo padrão das telas do app). */
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

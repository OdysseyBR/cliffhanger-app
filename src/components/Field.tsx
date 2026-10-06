/**
 * Campo de formulário com rótulo, olho de senha e mensagem de erro.
 */
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, TextInput, View, type KeyboardTypeOptions, type TextInputProps } from "react-native";

import { Colors, Fonts, Radius } from "@/constants/theme";

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  /** autocompletar do sistema (ex.: cc-number/cc-exp/cc-csc no cartão) */
  autoComplete?: TextInputProps["autoComplete"];
  maxLength?: number;
  error?: string | null;
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secure = false,
  keyboardType,
  autoCapitalize = "sentences",
  autoComplete = "off",
  maxLength,
  error,
}: FieldProps) {
  const [visible, setVisible] = useState(!secure);
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          fontFamily: Fonts.bodyMedium,
          fontSize: 11,
          letterSpacing: 1.4,
          color: focused ? Colors.accent : Colors.textMuted,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: Colors.surfaceAlt,
          borderWidth: 1,
          borderColor: error ? Colors.warning : focused ? Colors.accent : Colors.border,
          borderRadius: Radius.sm,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textFaint}
          accessibilityLabel={label}
          secureTextEntry={secure && !visible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          autoComplete={autoComplete}
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            minHeight: 48,
            paddingHorizontal: 14,
            paddingVertical: 10,
            fontFamily: Fonts.body,
            fontSize: 15,
            color: Colors.text,
          }}
        />
        {secure ? (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            accessibilityLabel={visible ? "Ocultar senha" : "Mostrar senha"}
            hitSlop={8}
            style={{ paddingHorizontal: 12 }}
          >
            <Ionicons
              name={visible ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={Colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{
            fontFamily: Fonts.bodyMedium,
            fontSize: 12,
            color: Colors.warning,
          }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Barra de abas redesenhada (identidade): indicador ativo em amarelo,
 * ícones/labels monocromáticos e respeito à safe area. Recebe os props do
 * bottom-tabs do Expo Router (expo-router/js-tabs).
 */
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { Pressable, Text, View } from "react-native";

import { Colors, Fonts } from "@/constants/theme";

export function TabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: Colors.background,
        borderTopWidth: 1,
        borderTopColor: Colors.line,
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 8),
        paddingHorizontal: 4,
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const color = focused ? Colors.accent : "#F8FEFF99";
        const label = options.title ?? route.name;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: "tabLongPress", target: route.key });
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={onLongPress}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
            style={({ pressed }) => [
              {
                flex: 1,
                alignItems: "center",
                gap: 3,
                paddingVertical: 2,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View
              style={{
                width: 18,
                height: 3,
                borderRadius: 2,
                backgroundColor: focused ? Colors.accent : "transparent",
              }}
            />
            {options.tabBarIcon?.({ focused, color, size: 22 })}
            <Text
              numberOfLines={1}
              style={{
                fontFamily: Fonts.bodyMedium,
                fontSize: 10.5,
                letterSpacing: 0.4,
                color,
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Layout raiz — fontes da identidade (Bebas Neue + Barlow), provedores de
 * sessão/carrinho e pilha de rotas (abas + produto + carrinho + leitor +
 * player de audiobook).
 */
import { Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold, Barlow_700Bold } from "@expo-google-fonts/barlow";
import { BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { AuthProvider } from "@/lib/useAuth";
import { CartProvider } from "@/lib/useCart";

SplashScreen.preventAutoHideAsync().catch(() => {
  /* já escondida em reloads */
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BebasNeue: BebasNeue_400Regular,
    BarlowRegular: Barlow_400Regular,
    BarlowMedium: Barlow_500Medium,
    BarlowSemiBold: Barlow_600SemiBold,
    BarlowBold: Barlow_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {
        /* nada a fazer */
      });
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="product/[id]" />
            <Stack.Screen name="cart" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="checkout" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="orders" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="reader/[id]" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="player/[id]" options={{ animation: "slide_from_right" }} />
          </Stack>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

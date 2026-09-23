import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import {
  Fraunces_400Regular,
  Fraunces_400Regular_Italic,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from "@expo-google-fonts/fraunces";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { SessionProvider } from "@/lib/session";
import { C, FONT } from "@/theme";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Fraunces and DM Sans are the website's faces; the app waits for them rather
  // than flashing a system font first.
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_400Regular,
    Fraunces_400Regular_Italic,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: C.cream },
            headerTintColor: C.ink,
            headerTitleStyle: { fontFamily: FONT.serif, fontSize: 18 },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: C.cream },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="trips" options={{ title: "Your trips", headerBackVisible: false }} />
          <Stack.Screen name="join/index" options={{ title: "Join a trip", presentation: "modal" }} />
          <Stack.Screen name="join/[code]" options={{ title: "Join a trip" }} />
          <Stack.Screen name="group/[id]" options={{ title: "" }} />
        </Stack>
      </SessionProvider>
    </SafeAreaProvider>
  );
}

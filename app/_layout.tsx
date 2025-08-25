import { useColorScheme } from "@/hooks/useColorScheme";
import { AbstraxionProvider } from "@burnt-labs/abstraxion-react-native";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Buffer } from "buffer";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-get-random-values";
import crypto from "react-native-quick-crypto";
import "react-native-reanimated";

global.crypto = crypto;
global.Buffer = Buffer;

SplashScreen.preventAutoHideAsync();

const treasuryConfig = {
  treasury: "xion1r0tt64mdld2svywzeaf4pa7ezsg6agkyajk48ea398njywdl28rs3jhvry",
  gasPrice: "0.001uxion",
  rpcUrl: "https://rpc.xion-testnet-2.burnt.com:443",
  restUrl: "https://api.xion-testnet-2.burnt.com:443",
  callbackUrl: "abstraxion-expo-demo://",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AbstraxionProvider config={treasuryConfig}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AbstraxionProvider>
  );
}
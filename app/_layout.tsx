import { useColorScheme } from "@/hooks/useColorScheme";
import "@/scripts/polyfills";
import { AbstraxionProvider } from "@burnt-labs/abstraxion-react-native";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-get-random-values";
import "react-native-reanimated";

// global.crypto = crypto;
// global.Buffer = Buffer;

SplashScreen.preventAutoHideAsync();

const treasuryConfig = {
  treasury: "xion1r0tt64mdld2svywzeaf4pa7ezsg6agkyajk48ea398njywdl28rs3jhvry",
  gasPrice: "0.001uxion",
  rpcUrl: "https://rpc.xion-testnet-2.burnt.com:443",
  restUrl: "https://api.xion-testnet-2.burnt.com:443",
  callbackUrl: "zeru-vmr://",
};

export default function RootLayout() {

  useEffect(() => {
    console.log("Globals ready:", !!global.crypto, !!global.Buffer);
  }, []);
  
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
          {/* Main Tab Navigator */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          
          {/* Standalone Stack Screens */}
          <Stack.Screen 
            name="healthWorkerDashboard" 
            options={{ title: "Health Worker Dashboard" }} 
          />
          <Stack.Screen 
            name="patientDashboard" 
            options={{ title: "Patient Dashboard" }} 
          />
          
          {/* Not Found Screen */}
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AbstraxionProvider>
  );
}
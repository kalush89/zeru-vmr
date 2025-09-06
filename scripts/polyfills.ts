// polyfills.ts
import "react-native-get-random-values";
import "react-native-reanimated";

// Polyfill crypto
import { Buffer } from "buffer";
import crypto from "react-native-quick-crypto";

// Ensure globals are patched safely
if (typeof global.crypto === "undefined") {
  // @ts-ignore
  global.crypto = crypto;
}

if (typeof global.Buffer === "undefined") {
  // @ts-ignore
  global.Buffer = Buffer;
}

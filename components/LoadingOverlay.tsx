import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

type LoadingOverlayProps = {
  loading: boolean;
};

export default function LoadingOverlay({ loading }: LoadingOverlayProps) {
  if (!loading) return null;
  return (
    <View style={styles.overlay}>
      <ActivityIndicator size="large" color="#2196F3" />
      <Text style={styles.text}>Processing...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  text: { color: "#fff", marginTop: 10 },
});

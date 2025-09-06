import { StyleSheet, Text, View } from "react-native";

type MessageCardProps = {
  message?: string;
};

export default function MessageCard({ message }: MessageCardProps) {
  if (!message) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#e0f7fa", padding: 12, borderRadius: 8, marginBottom: 15 },
  text: { color: "#006064", fontSize: 16, textAlign: "center" },
});

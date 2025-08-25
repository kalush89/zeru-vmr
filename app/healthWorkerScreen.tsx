import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HealthWorkerHomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Health Worker Dashboard</Text>
      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => router.push('../antenatalLogScreen')}
      >
        <Text style={styles.linkButtonText}>Antenatal Visit Logs</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => router.push('../immunizationLogScreen')}
      >
        <Text style={styles.linkButtonText}>Immunization Logs</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 40,
    textAlign: 'center',
  },
  linkButton: {
    backgroundColor: '#3498DB',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  linkButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
});
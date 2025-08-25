import { ImmunizationLogData } from '@/types/immunizationLogData';
import { useAbstraxionSigningClient } from '@burnt-labs/abstraxion-react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import storage from '../storage';

export default function ImmunizationLogScreen() {
  const [patientFirstName, setPatientFirstName] = useState('');
  const [patientLastName, setPatientLastName] = useState('');
  const [vaccineType, setVaccineType] = useState('');
  const [doseNumber, setDoseNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [logs, setLogs] = useState<ImmunizationLogData[]>([]);
  const [isOffline, setIsOffline] = useState(true); // Default to offline-first
  const [isSaving, setIsSaving] = useState(false);

  const { client, signArb } = useAbstraxionSigningClient();

  useEffect(() => {
    // Always load logs from local storage (offline-first)
    loadLogs();

    // Listen to network changes to update offline/online status
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsOffline(!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  const loadLogs = async () => {
    try {
      const data = await storage.load({ key: 'immunizationLogs' });
      setLogs(data);
    } catch (err) {
      if (err instanceof Error && err.name !== 'NotFoundError') {
        console.warn('Failed to load immunization logs:', err);
      }
    }
  };

  const handleSave = async () => {
    if (!patientFirstName || !patientLastName || !vaccineType || !doseNumber) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }
    setIsSaving(true);
    try {
      const log: ImmunizationLogData = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        patientFirstName,
        patientLastName,
        vaccineType,
        doseNumber,
        administeredBy: client?.granteeAddress || 'Healthcare Worker',
        notes,
        signature: '',
        status: isOffline ? 'Pending Sync (Offline)' : 'Synced (Online)',
      };

      if (signArb && client?.granteeAddress) {
        const signature = await signArb(client.granteeAddress, JSON.stringify(log));
        log.signature = signature;
        log.status = isOffline ? 'Pending Sync (Offline) - Signed' : 'Synced (Online) - Signed';
      }

      let logsArr: ImmunizationLogData[] = [];
      try {
        logsArr = await storage.load({ key: 'immunizationLogs' });
      } catch (err) {
        if (err instanceof Error && err.name !== 'NotFoundError') throw err;
      }
      logsArr.unshift(log);
      await storage.save({ key: 'immunizationLogs', data: logsArr });

      setLogs([log, ...logs]);
      setPatientFirstName('');
      setPatientLastName('');
      setVaccineType('');
      setDoseNumber('');
      setNotes('');
      Alert.alert('Success', 'Immunization log saved locally!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save immunization log.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Immunization Log Entry</Text>
        <Text style={styles.offlineStatus}>
          {isOffline ? 'Offline Mode: Entries are saved locally.' : 'Online Mode: Entries can be synced.'}
        </Text>
        <TextInput style={styles.input} placeholder="Patient First Name" value={patientFirstName} onChangeText={setPatientFirstName} />
        <TextInput style={styles.input} placeholder="Patient Last Name" value={patientLastName} onChangeText={setPatientLastName} />
        <TextInput style={styles.input} placeholder="Vaccine Type" value={vaccineType} onChangeText={setVaccineType} />
        <TextInput style={styles.input} placeholder="Dose Number" value={doseNumber} onChangeText={setDoseNumber} />
        <TextInput style={styles.input} placeholder="Notes (optional)" value={notes} onChangeText={setNotes} />
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Log</Text>}
        </TouchableOpacity>
        <Text style={styles.sectionTitle}>Immunization Logs</Text>
        {logs.length === 0 ? (
          <Text style={styles.noEntriesText}>No immunization logs yet.</Text>
        ) : (
          logs.map((log) => (
            <View key={log.id} style={styles.entryCard}>
              <Text style={styles.entryText}><Text style={{ fontWeight: 'bold' }}>Patient First Name:</Text> {log.patientFirstName}</Text>
              <Text style={styles.entryText}><Text style={{ fontWeight: 'bold' }}>Patient Last Name:</Text> {log.patientLastName}</Text>
              <Text style={styles.entryText}><Text style={{ fontWeight: 'bold' }}>Vaccine:</Text> {log.vaccineType}</Text>
              <Text style={styles.entryText}><Text style={{ fontWeight: 'bold' }}>Dose:</Text> {log.doseNumber}</Text>
              <Text style={styles.entryText}><Text style={{ fontWeight: 'bold' }}>Time:</Text> {new Date(log.timestamp).toLocaleString()}</Text>
              {log.notes ? <Text style={styles.entryText}><Text style={{ fontWeight: 'bold' }}>Notes:</Text> {log.notes}</Text> : null}
              <Text style={styles.entryText}><Text style={{ fontWeight: 'bold' }}>Status:</Text> {log.status}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  scrollContent: { padding: 20, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '700', color: '#2C3E50', marginBottom: 10, textAlign: 'center' },
  offlineStatus: { fontSize: 14, color: '#888', marginBottom: 15, textAlign: 'center' },
  input: { width: '100%', height: 50, backgroundColor: '#FFFFFF', borderRadius: 8, paddingHorizontal: 15, fontSize: 16, color: '#34495E', borderColor: '#DCDCDC', borderWidth: 1, marginBottom: 12 },
  saveButton: { backgroundColor: '#3498DB', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 8, width: '100%', alignItems: 'center', marginTop: 10, marginBottom: 30 },
  saveButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  sectionTitle: { fontSize: 22, fontWeight: '700', color: '#2C3E50', marginTop: 20, marginBottom: 15, alignSelf: 'flex-start' },
  entryCard: { backgroundColor: '#FFFFFF', padding: 18, borderRadius: 10, width: '100%', marginBottom: 15, borderColor: '#E0E0E0', borderWidth: 1 },
  entryText: { fontSize: 15, color: '#34495E', marginBottom: 5, lineHeight: 22 },
  noEntriesText: { fontSize: 16, color: '#7F8C8D', fontStyle: 'italic', marginTop: 10 },
});
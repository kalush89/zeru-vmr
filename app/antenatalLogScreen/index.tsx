import { AntPostLogData } from '@/types/antPostLogData';
import { useAbstraxionSigningClient } from '@burnt-labs/abstraxion-react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
// Import the storage instance
import storage from '../../storage'; // Adjust path as needed


export default function AntenatalLogScreen() {
  const [bloodPressureSys, setBloodPressureSys] = useState('');
  const [bloodPressureDia, setBloodPressureDia] = useState('');
  const [weight, setWeight] = useState('');
  const [fundalHeight, setFundalHeight] = useState('');
  const [testResults, setTestResults] = useState('');
  const [loggedInEntries, setLoggedInEntries] = useState<AntPostLogData[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { client, signArb } = useAbstraxionSigningClient();

  useEffect(() => {
    NetInfo.fetch().then((state: NetInfoState) => {
      setIsOffline(!state.isConnected);
    });
    // Load offline entries from storage on mount
    loadOfflineEntries();
    console.log('App started. Assume online by default, toggle to simulate offline.');
  }, []);

  // Load offline entries from storage
  const loadOfflineEntries = async () => {
    try {
      const entries = await storage.load({ key: 'offlineEntries' });
      setLoggedInEntries(entries);
    } catch (err) {
      // NotFoundError is expected if nothing is stored yet
      if (err instanceof Error && err.name !== 'NotFoundError') {
        console.warn('Failed to load offline entries:', err);
      }
    }
  };

  const handleSaveData = async () => {
    if (!bloodPressureSys || !bloodPressureDia || !weight || !fundalHeight || !testResults) {
      Alert.alert('Missing Information', 'Please fill in all vital signs and test results.');
      return;
    }

    setIsSaving(true);

    try {
      const dataToLog: AntPostLogData = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        bloodPressure: `${bloodPressureSys}/${bloodPressureDia}`,
        weight: `${weight} kg`,
        fundalHeight: `${fundalHeight} cm`,
        testResults,
        signedBy: client?.granteeAddress || 'Healthcare Worker',
        signature: "",
        status: isOffline ? 'Pending Sync (Offline)' : 'Synced (Online)',
      };

      if (signArb && client?.granteeAddress) {
        const signature = await signArb(client.granteeAddress, JSON.stringify(dataToLog));
        dataToLog.signature = signature;
        dataToLog.status = isOffline ? 'Pending Sync (Offline) - Signed' : 'Synced (Online) - Signed';
      } else {
        console.warn('Abstraxion signing client not available or granteeAddress missing. Data will not be cryptographically signed. Ensure user is logged in.');
        dataToLog.signature = 'No client/granteeAddress available for signing.';
      }

      if (isOffline) {
        // Save to react-native-storage
        try {
          let offlineEntries = [];
          try {
            offlineEntries = await storage.load({ key: 'offlineEntries' });
          } catch (err) {
            if (err instanceof Error && err.name !== 'NotFoundError') throw err;
          }
          offlineEntries.unshift(dataToLog);
          await storage.save({
            key: 'offlineEntries',
            data: offlineEntries,
          });
        } catch (storageErr) {
          console.warn('Failed to save offline entry:', storageErr);
        }
      } else {
        // Here you would push to blockchain/server
        console.log('Would push to blockchain/server:', dataToLog);
      }

      setLoggedInEntries((prevEntries) => [dataToLog, ...prevEntries]);
      setBloodPressureSys('');
      setBloodPressureDia('');
      setWeight('');
      setFundalHeight('');
      setTestResults('');

      Alert.alert('Success', 'Data saved successfully!');
    } catch (error) {
      console.error('Error saving data:', error);
      Alert.alert('Error', 'Failed to save data. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleOfflineMode = () => {
    setIsOffline((prev) => !prev);
    Alert.alert('Network Status', isOffline ? 'Switched to Online Mode' : 'Switched to Offline Mode');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Antenatal Visit Data Entry</Text>
        <TouchableOpacity
          style={[styles.offlineToggle, isOffline ? styles.offlineActive : styles.offlineInactive]}
          onPress={toggleOfflineMode}
        >
          <Text style={styles.offlineToggleText}>
            {isOffline ? 'Currently Offline' : 'Currently Online'}
          </Text>
        </TouchableOpacity>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Blood Pressure (mmHg)</Text>
          <View style={styles.rowInput}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 10 }]}
              placeholder="Systolic"
              keyboardType="numeric"
              value={bloodPressureSys}
              onChangeText={setBloodPressureSys}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Diastolic"
              keyboardType="numeric"
              value={bloodPressureDia}
              onChangeText={setBloodPressureDia}
            />
          </View>
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Weight (kg)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 65.5"
            keyboardType="numeric"
            value={weight}
            onChangeText={setWeight}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Fundal Height (cm)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 28"
            keyboardType="numeric"
            value={fundalHeight}
            onChangeText={setFundalHeight}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Test Results</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter test results, e.g., 'Hemoglobin: 12 g/dL, Urine: Negative'"
            multiline
            numberOfLines={4}
            value={testResults}
            onChangeText={setTestResults}
          />
        </View>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveData}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Entry</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.sectionTitle}>Recently Logged Entries</Text>
        {loggedInEntries.length === 0 ? (
          <Text style={styles.noEntriesText}>No entries logged yet.</Text>
        ) : (
          loggedInEntries.map((entry) => (
            <View key={entry.id} style={styles.entryCard}>
              <Text style={styles.entryText}>
                <Text style={{ fontWeight: 'bold' }}>Time:</Text>{' '}
                {new Date(entry.timestamp).toLocaleString()}
              </Text>
              <Text style={styles.entryText}>
                <Text style={{ fontWeight: 'bold' }}>BP:</Text> {entry.bloodPressure}
              </Text>
              <Text style={styles.entryText}>
                <Text style={{ fontWeight: 'bold' }}>Weight:</Text> {entry.weight}
              </Text>
              <Text style={styles.entryText}>
                <Text style={{ fontWeight: 'bold' }}>Fundal Height:</Text> {entry.fundalHeight}
              </Text>
              <Text style={styles.entryText}>
                <Text style={{ fontWeight: 'bold' }}>Results:</Text> {entry.testResults}
              </Text>
              <Text style={styles.entryText}>
                <Text style={{ fontWeight: 'bold' }}>Signed By:</Text> {entry.signedBy}
              </Text>
              <Text style={styles.entryText}>
                <Text style={{ fontWeight: 'bold' }}>Status:</Text>{' '}
                <Text style={{ color: entry.status.includes('Pending') ? '#FFA500' : '#4CAF50' }}>
                  {entry.status}
                </Text>
              </Text>
              {entry.signature && (
                <Text style={styles.entrySignatureText}>
                  Signature: {entry.signature.substring(0, 50)}...
                </Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 25,
    textAlign: 'center',
  },
  offlineToggle: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginBottom: 20,
    alignSelf: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  offlineActive: {
    backgroundColor: '#FF5C5C', // Red for offline
  },
  offlineInactive: {
    backgroundColor: '#4CAF50', // Green for online
  },
  offlineToggleText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    color: '#34495E',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#34495E',
    borderColor: '#DCDCDC',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  rowInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  textArea: {
    height: 100,
    paddingVertical: 15,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#3498DB',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C3E50',
    marginTop: 20,
    marginBottom: 15,
    alignSelf: 'flex-start',
  },
  entryCard: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 10,
    width: '100%',
    marginBottom: 15,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2.62,
    elevation: 4,
  },
  entryText: {
    fontSize: 15,
    color: '#34495E',
    marginBottom: 5,
    lineHeight: 22,
  },
  entrySignatureText: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 10,
    fontStyle: 'italic',
  },
  noEntriesText: {
    fontSize: 16,
    color: '#7F8C8D',
    fontStyle: 'italic',
    marginTop: 10,
  },
});

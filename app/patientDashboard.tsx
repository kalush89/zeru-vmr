import { retryOperation } from "@/scripts/retry";
import { DocuStoreDocument, DocuStoreQueryResponse, HealthRecords } from "@/scripts/types"; // Import DocuStoreQueryResponse
import { AbstraxionAccount } from "@burnt-labs/abstraxion-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

interface PatientDashboardProps {
  account: AbstraxionAccount | undefined;
  signingClient: {
    execute: (address: string, contract: string, msg: any, type: string, memo?: string) => Promise<any>;
  };
  queryClient: { queryContractSmart: (address: string, query: any) => Promise<any> };
  linkedUUID: string | undefined;
  setLinkedUUID: (uuid: string | undefined) => void;
  patientRecords: HealthRecords[];
  setPatientRecords: (records: HealthRecords[]) => void;
  setLoading: (loading: boolean) => void; // Global loading state from App.tsx
  showMessage: (message: string, type?: "success" | "error") => void;
  contractAddress: string;
}

export default function PatientDashboard({
  account,
  signingClient,
  queryClient,
  linkedUUID,
  setLinkedUUID,
  patientRecords,
  setPatientRecords,
  setLoading,
  showMessage,
  contractAddress,
}: PatientDashboardProps) {
  const [inputUUID, setInputUUID] = useState("");
  const [isLinking, setIsLinking] = useState(false); // Local loading for linking
  const [isFetchingRecords, setIsFetchingRecords] = useState(false); // Local loading for fetching records

  // --- useEffect to automatically fetch records when linkedUUID is available ---
  useEffect(() => {
    if (linkedUUID) {
      handleViewRecords();
    }
  }, [linkedUUID]); // Depend on linkedUUID

  async function handleLinkRecords() {
    if (!signingClient || !account?.bech32Address) {
      showMessage("Client or account not ready. Please log in.", "error");
      return;
    }
    if (!inputUUID.trim()) {
      showMessage("Please enter a valid Patient UUID.", "error");
      return;
    }

    setIsLinking(true); // Start local loading for linking
    setLoading(true); // Propagate to global loading
    try {
      const linkageDocument = { patientAddress: account.bech32Address, linkedUUID: inputUUID.trim() };
      await retryOperation(() =>
        signingClient.execute(
          account.bech32Address,
          contractAddress,
          {
            Set: {
              owner: account.bech32Address, // Owner of the linkage document is the patient
              collection: "patient_linkage", // The collection for UUID linkages
              document_id: account.bech32Address, // Document ID is the patient's address
              data: JSON.stringify(linkageDocument),
            },
          },
          "auto",
          "Link patient records" // Memo for the transaction
        )
      );
      setLinkedUUID(inputUUID.trim());
      setInputUUID("");
      showMessage(`Successfully linked to UUID: ${inputUUID.trim()}.`);
    } catch (err: unknown) { // Use unknown for safety
      let errorMessage = "An unknown error occurred.";
      if (err instanceof Error) {
        // DocuStore might return specific errors like "Document already exists"
        // or "UUID already claimed" which you can parse from err.message
        errorMessage = err.message;
      }
      showMessage(`Error linking records: ${errorMessage}`, "error");
    } finally {
      setIsLinking(false); // End local loading
      setLoading(false); // End global loading
    }
  }

  async function handleViewRecords() {
    if (!queryClient || !linkedUUID) {
      showMessage("Not linked to a UUID or query client not ready.", "error");
      setPatientRecords([]); // Clear records if conditions aren't met
      return;
    }

    setIsFetchingRecords(true); // Start local loading for fetching
    setLoading(true); // Propagate to global loading
    try {
      const res: DocuStoreQueryResponse = await retryOperation(() =>
        queryClient.queryContractSmart(contractAddress, {
          UserDocuments: { owner: linkedUUID, collection: "health_records" }, // Query using the linkedUUID as owner
        })
      );

      if (res?.documents && res.documents.length > 0) {
        const records: HealthRecords[] = res.documents.map((doc: DocuStoreDocument) => JSON.parse(doc.data));
        // Sort records by timestamp for better readability
        records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setPatientRecords(records);
        showMessage(`Retrieved ${records.length} health records.`);
      } else {
        setPatientRecords([]);
        showMessage("No records found for this UUID.", "error");
      }
    } catch (err: unknown) {
      let errorMessage = "An unknown error occurred.";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      showMessage(`Error fetching records: ${errorMessage}`, "error");
      setPatientRecords([]); // Clear records on error
    } finally {
      setIsFetchingRecords(false); // End local loading
      setLoading(false); // End global loading
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.section}>
        <Text style={styles.title}>Patient Dashboard</Text>

        {!linkedUUID ? (
          // UI for linking records if no UUID is linked
          <>
            <Text style={styles.subtitle}>Link your health records using the UUID provided by your Healthcare Worker.</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter Patient UUID (e.g., xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)"
              value={inputUUID}
              onChangeText={setInputUUID}
              autoCapitalize="none"
              keyboardAppearance="dark"
            />
            <TouchableOpacity onPress={handleLinkRecords} style={styles.button} disabled={isLinking}>
              {isLinking ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Link My Records</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          // UI for viewing records if UUID is linked
          <>
            <Text style={styles.linkedUUIDText}>Your Linked Health ID: <Text style={styles.linkedUUIDValue}>{linkedUUID}</Text></Text>
            
            <TouchableOpacity onPress={handleViewRecords} style={styles.button} disabled={isFetchingRecords}>
              {isFetchingRecords ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Refresh Health Records</Text>
              )}
            </TouchableOpacity>

            {patientRecords.length === 0 && !isFetchingRecords ? (
              <Text style={styles.noRecordsText}>No health records found for this ID.</Text>
            ) : (
              <View style={styles.recordsList}>
                <Text style={styles.recordsHeader}>Your Health History ({patientRecords.length} records)</Text>
                {patientRecords.map((record, i) => (
                  <View key={record.id || i} style={styles.recordItem}>
                    <View style={styles.recordHeader}>
                      <Text style={styles.recordType}>{record.record_type} Record</Text>
                      <Text style={styles.recordDate}>{new Date(record.timestamp).toLocaleDateString()}</Text>
                    </View>
                    <Text style={styles.patientNameText}>{record.patient_firstname} {record.patient_lastname}, {record.patient_sex}</Text>
                    {record.date_of_birth && <Text style={styles.recordDetail}>DOB: {record.date_of_birth}</Text>}

                    {record.record_type === "Antenatal" && (
                      <View style={styles.recordDetailsBlock}>
                        {record.bp && <Text style={styles.recordDetail}>BP: {record.bp}</Text>}
                        {record.weight && <Text style={styles.recordDetail}>Weight: {record.weight}</Text>}
                        {record.fundal_height && <Text style={styles.recordDetail}>Fundal Height: {record.fundal_height}</Text>}
                        {record.test_results && <Text style={styles.recordDetail}>Notes: {record.test_results}</Text>}
                      </View>
                    )}

                    {record.record_type === "Immunization" && (
                      <View style={styles.recordDetailsBlock}>
                        {record.vaccine_type && <Text style={styles.recordDetail}>Vaccine: {record.vaccine_type}</Text>}
                        {record.date_administered && <Text style={styles.recordDetail}>Administered: {record.date_administered}</Text>}
                        {record.batch_number && <Text style={styles.recordDetail}>Batch: {record.batch_number}</Text>}
                        {record.next_dose_date && <Text style={styles.recordDetail}>Next Dose: {record.next_dose_date}</Text>}
                        {record.zk_registry_verified && <Text style={styles.verifiedBadge}>Registry Verified ✅</Text>}
                      </View>
                    )}

                    <Text style={styles.provenanceText}>Logged by: {record.created_by_hw_name} ({record.created_by_hw_address.substring(0, 8)}...) at {record.created_by_hw_facility}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#f0f0f0',
  },
  section: {
    width: "90%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    marginTop: 15,
    padding: 15,
    backgroundColor: "#2196F3",
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  linkedUUIDText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 10,
    textAlign: 'center',
  },
  linkedUUIDValue: {
    fontWeight: 'bold',
    color: '#333',
  },
  noRecordsText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  recordsList: {
    marginTop: 20,
    width: '100%',
  },
  recordsHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  recordItem: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 5,
  },
  recordType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  recordDate: {
    fontSize: 12,
    color: '#777',
  },
  patientNameText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  recordDetailsBlock: {
    marginTop: 5,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#f0f0f0',
  },
  recordDetail: {
    fontSize: 14,
    color: '#555',
    marginBottom: 3,
  },
  verifiedBadge: {
    backgroundColor: '#E8F5E9',
    color: '#28A745',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 5,
    fontSize: 12,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  provenanceText: {
    fontSize: 12,
    color: '#777',
    marginTop: 10,
    fontStyle: 'italic',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
  }
});

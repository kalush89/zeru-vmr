import ReclaimComponent from "@/components/ReclaimComponent";
import { retryOperation } from "@/scripts/retry";
import { DocuStoreSingleDocumentResponse, HealthRecords, HWProfile } from "@/scripts/types";
import { AbstraxionAccount } from "@burnt-labs/abstraxion-react-native";
import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { v4 as uuidv4 } from "uuid";


interface HealthcareWorkerDashboardProps {
  account: AbstraxionAccount | undefined;
  signingClient: {
    execute: (address: string, contract: string, msg: any, type: string, memo?: string) => Promise<any>;
  };
  queryClient: { queryContractSmart: (address: string, query: any) => Promise<any> };
  setLoading: (loading: boolean) => void;
  showMessage: (message: string, type?: "success" | "error" | "info") => void;
  contractAddress: string; // The DocuStore contract address
}

// Initial state for a new record, reflecting the HealthRecords interface.
const initialFormData: HealthRecords = {
  record_type: "Antenatal",
  id: "",
  uuid: "",
  patient_firstname: "",
  patient_lastname: "",
  patient_sex: "",
  date_of_birth: "",

  bp: "",
  weight: "",
  fundal_height: "",
  test_results: "",

  vaccine_type: "",
  date_administered: "",
  batch_number: "",
  next_dose_date: "",
  zk_registry_verified: false,

  created_by_hw_address: "",
  created_by_hw_name: "",
  created_by_hw_facility: "",
  created_by_hw_is_license_verified: false, // Default to false
  timestamp: "",
};


export default function HealthcareWorkerDashboard({
  account,
  signingClient,
  queryClient,
  setLoading,
  showMessage,
  contractAddress,
}: HealthcareWorkerDashboardProps) {
  const [recordType, setRecordType] = useState<"Antenatal" | "Immunization">("Antenatal");
  const [formData, setFormData] = useState<HealthRecords>(initialFormData);

  const [hwProfile, setHwProfile] = useState<HWProfile | null>(null);
  const [isFetchingHwProfile, setIsFetchingHwProfile] = useState(true);

  // --- useEffect to fetch HW Profile AND check zkTLS verification status ---
  useEffect(() => {
    async function fetchData() {
      if (!account?.bech32Address || !queryClient || !contractAddress) {
        setIsFetchingHwProfile(false);
        return;
      }

      setIsFetchingHwProfile(true);
      try {
        // 1. Fetch HW Profile from DocuStore
        const profileRes: DocuStoreSingleDocumentResponse = await retryOperation(() =>
          queryClient.queryContractSmart(contractAddress, {
            UserDocument: { owner: account.bech32Address, collection: "HWProfiles", document_id: account.bech32Address },
          })
        );

        let fetchedProfile: HWProfile | null = null;
        if (profileRes?.document?.data) {
          fetchedProfile = JSON.parse(profileRes.document.data);
        }

        // 2. Query the RUM Contract to check for the proof
        let isLicenseVerifiedOnChain = false;
        if (fetchedProfile?.job_title) {
          try {
            // Query the RUM contract for the proof document associated with the user's address
            // RUM_CONTRACT_ADDRESS is now handled by ReclaimComponent
            const rumQueryResponse = await retryOperation(() =>
              queryClient.queryContractSmart(process.env.EXPO_PUBLIC_RUM_CONTRACT_ADDRESS ?? "", {
                Get: { owner: account.bech32Address }, // Assuming a 'Get' query for a document based on address
              })
            );
            // If the proof document exists, the license is verified.
            isLicenseVerifiedOnChain = !!rumQueryResponse?.proof;
          } catch (zkErr: unknown) {
            console.warn("Could not query RUM contract for proof:", zkErr);
            // Don't show a user-facing error for this, as it's a normal state for unverified users.
          }
        }
        
        // Update the fetchedProfile with the latest verification status
        if (fetchedProfile) {
          fetchedProfile.is_license_verified = isLicenseVerifiedOnChain;
          setHwProfile(fetchedProfile);
          showMessage("Healthcare Worker profile and license status loaded.", "success");
        } else {
          showMessage("HW profile not found for this address. Please contact admin.", "error");
        }
      } catch (err: unknown) {
        let errorMessage = "An unknown error occurred.";
        if (err instanceof Error) {
          errorMessage = err.message;
        }
        showMessage(`Error fetching HW profile or zkTLS status: ${errorMessage}`, "error");
        setHwProfile(null);
      } finally {
        setIsFetchingHwProfile(false);
      }
    }

    fetchData();
  }, [account?.bech32Address, queryClient, contractAddress, showMessage]);


  const handleInputChange = (field: keyof HealthRecords, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleRecordType = (type: "Antenatal" | "Immunization") => {
    setRecordType(type);
    setFormData({ ...initialFormData, record_type: type });
  };


  async function handleCreatePatientRecord() {
    if (!signingClient || !account?.bech32Address) {
      showMessage("Client or account not ready. Please log in.", "error");
      return;
    }
    // Gating mechanism: Must have a loaded HW profile AND it must be license verified
    if (!hwProfile || !hwProfile.is_license_verified) {
      showMessage("Your professional license must be verified to create patient records.", "error");
      return;
    }

    setLoading(true);
    let currentRecord: HealthRecords = { ...formData };
    let requiredFieldsMet = true;
    const patientUUID = uuidv4();

    if (!currentRecord.patient_firstname.trim() || !currentRecord.patient_lastname.trim()) {
      requiredFieldsMet = false;
      showMessage("Patient First Name and Last Name are required.", "error");
      setLoading(false);
      return;
    }

    currentRecord.uuid = patientUUID;
    currentRecord.id = uuidv4();

    currentRecord.created_by_hw_address = account.bech32Address;
    currentRecord.created_by_hw_name = hwProfile.name;
    currentRecord.created_by_hw_facility = hwProfile.facilityName;
    currentRecord.created_by_hw_is_license_verified = hwProfile.is_license_verified; // Set verification status at record creation
    currentRecord.timestamp = new Date().toISOString();

    if (currentRecord.record_type === "Antenatal") {
      if (!currentRecord.patient_sex || !currentRecord.bp || !currentRecord.weight || !currentRecord.fundal_height || !currentRecord.test_results) {
        requiredFieldsMet = false;
      }
    } else { // Immunization
      if (!currentRecord.patient_sex || !currentRecord.vaccine_type || !currentRecord.date_administered || !currentRecord.batch_number || !currentRecord.next_dose_date) {
        requiredFieldsMet = false;
      }
    }

    if (!requiredFieldsMet) {
      showMessage(`Please fill in all required ${currentRecord.record_type} fields.`, "error");
      setLoading(false);
      return;
    }

    try {
      await retryOperation(() =>
        signingClient.execute(
          account.bech32Address,
          contractAddress,
          {
            Set: {
              owner: currentRecord.uuid,
              collection: "health_records",
              document_id: currentRecord.id,
              data: JSON.stringify(currentRecord),
            },
          },
          "auto",
          `Create ${currentRecord.record_type} record for ${currentRecord.patient_firstname} ${currentRecord.patient_lastname}`
        )
      );
      
      setFormData({ ...initialFormData, record_type: recordType });
      showMessage(`New ${currentRecord.record_type} record created! Patient UUID: ${patientUUID}. Share securely.`);
    } catch (err: unknown) {
      let errorMessage = "An unknown error occurred.";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      showMessage(`Error creating record: ${errorMessage}`, "error");
    } finally {
      setLoading(false);
    }
  }

  // --- Render logic for loading and errors ---
  if (isFetchingHwProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading Healthcare Worker profile...</Text>
      </View>
    );
  }
  if (!hwProfile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Could not load Healthcare Worker profile. Please ensure you are logged in and your profile has been set up by an admin.
        </Text>
        <Text style={styles.errorText}>
          Your Address: {account?.bech32Address || "Not available"}
        </Text>
      </View>
    );
  }

  // --- Main Render: Conditional based on license verification status ---
  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.section}>
        <Text style={styles.title}>Healthcare Worker Dashboard</Text>
        <Text style={styles.subtitle}>
          Logged in as: {hwProfile.name} ({hwProfile.job_title}) at {hwProfile.facilityName}
        </Text>

        {/* --- License Verification Section --- */}
        {!hwProfile.is_license_verified ? (
          <View style={styles.verificationPromptContainer}>
            <Text style={styles.verificationPromptText}>
              Your professional license (as a {hwProfile.job_title}) is not yet verified. You must complete this step to create patient records.
            </Text>
            <ReclaimComponent showMessage={showMessage} healthWorkerRole={hwProfile.job_title as "doctor" | "community_health_practitioner" | "nurse_midwife"} />
          </View>
        ) : (
          // --- Record Creation Form (only visible if license is verified) ---
          <>
            <Text style={styles.verifiedStatusText}>
              License Status: <Text style={styles.verifiedStatusBadge}>Verified ✅</Text>
            </Text>

            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, recordType === "Antenatal" && styles.toggleButtonActive]}
                onPress={() => handleToggleRecordType("Antenatal")}
              >
                <Text style={recordType === "Antenatal" ? styles.toggleButtonTextActive : styles.toggleButtonText}>Antenatal Log</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, recordType === "Immunization" && styles.toggleButtonActive]}
                onPress={() => handleToggleRecordType("Immunization")}
              >
                <Text style={recordType === "Immunization" ? styles.toggleButtonTextActive : styles.toggleButtonText}>Immunization Log</Text>
              </TouchableOpacity>
            </View>

            {/* Patient Demographics */}
            <Text style={styles.formSectionHeader}>Patient Information</Text>
            <TextInput
              style={styles.input}
              placeholder="Patient First Name"
              value={formData.patient_firstname}
              onChangeText={(t) => handleInputChange('patient_firstname', t)}
            />
            <TextInput
              style={styles.input}
              placeholder="Patient Last Name"
              value={formData.patient_lastname}
              onChangeText={(t) => handleInputChange('patient_lastname', t)}
            />
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.patient_sex}
                onValueChange={(itemValue) => handleInputChange('patient_sex', itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Select Patient Sex" value="" />
                <Picker.Item label="Female" value="Female" />
                <Picker.Item label="Male" value="Male" />
              </Picker>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Patient Date of Birth (YYYY-MM-DD)"
              value={formData.date_of_birth}
              onChangeText={(t) => handleInputChange('date_of_birth', t)}
              keyboardType={Platform.OS === "ios" ? "default" : "visible-password"}
            />

            {/* Conditional Record Type Fields */}
            <Text style={styles.formSectionHeader}>
                {recordType === "Antenatal" ? "Antenatal Visit Details" : "Immunization Details"}
            </Text>
            {recordType === "Antenatal" ? (
              <>
                <View style={styles.inlineInputs}>
                  <TextInput style={[styles.input, styles.halfInput]} placeholder="BP Systolic" value={formData.bp?.split('/')[0] || ''} onChangeText={(t) => handleInputChange('bp', `${t}/${formData.bp?.split('/')[1] || ''}`)} keyboardType="numeric" />
                  <Text style={styles.slash}>/</Text>
                  <TextInput style={[styles.input, styles.halfInput]} placeholder="BP Diastolic" value={formData.bp?.split('/')[1] || ''} onChangeText={(t) => handleInputChange('bp', `${formData.bp?.split('/')[0] || ''}/${t}`)} keyboardType="numeric" />
                </View>
                <TextInput style={styles.input} placeholder="Weight (kg)" value={formData.weight} onChangeText={(t) => handleInputChange('weight', t)} keyboardType="numeric" />
                <TextInput style={styles.input} placeholder="Fundal Height (cm)" value={formData.fundal_height} onChangeText={(t) => handleInputChange('fundal_height', t)} keyboardType="numeric" />
                <TextInput style={styles.input} placeholder="Test Results / Notes" value={formData.test_results} onChangeText={(t) => handleInputChange('test_results', t)} multiline numberOfLines={3} />
              </>
            ) : (
              <>
                <TextInput style={styles.input} placeholder="Vaccine Name (e.g., MMR)" value={formData.vaccine_type} onChangeText={(t) => handleInputChange('vaccine_type', t)} />
                <TextInput style={styles.input} placeholder="Date Administered (YYYY-MM-DD)" value={formData.date_administered} onChangeText={(t) => handleInputChange('date_administered', t)} keyboardType={Platform.OS === "ios" ? "default" : "visible-password"} />
                <TextInput style={styles.input} placeholder="Vaccine Batch Number" value={formData.batch_number} onChangeText={(t) => handleInputChange('batch_number', t)} />
                <TextInput style={styles.input} placeholder="Next Dose Date (YYYY-MM-DD)" value={formData.next_dose_date} onChangeText={(t) => handleInputChange('next_dose_date', t)} keyboardType={Platform.OS === "ios" ? "default" : "visible-password"} />
              </>
            )}

            <TouchableOpacity onPress={handleCreatePatientRecord} style={styles.button}>
              <Text style={styles.buttonText}>Create {recordType === "Antenatal" ? "Antenatal" : "Immunization"} Record</Text>
            </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F', // Red error color
    textAlign: 'center',
    marginBottom: 10,
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
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 5, color: '#333', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#555', marginBottom: 20, textAlign: 'center' },
  toggleContainer: { flexDirection: "row", marginBottom: 20, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: "#2196F3" },
  toggleButton: { flex: 1, padding: 12, alignItems: "center", backgroundColor: '#f0f8ff' },
  toggleButtonActive: { backgroundColor: "#2196F3" },
  toggleButtonText: { color: "#2196F3", fontWeight: '600', fontSize: 16 },
  toggleButtonTextActive: { color: "#fff", fontWeight: '600', fontSize: 16 },
  formSectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
    width: '100%',
  },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 12, borderRadius: 8, marginBottom: 10, fontSize: 16 },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 10,
    justifyContent: 'center',
    height: 50, // Adjust height as needed
  },
  picker: {
    height: 50, // Ensure picker itself takes full height of its container
    width: '100%',
  },
  inlineInputs: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  halfInput: { flex: 1, marginRight: 5 },
  slash: { marginHorizontal: 5, fontSize: 18, fontWeight: 'bold', color: '#555' },
  button: { marginTop: 20, padding: 15, backgroundColor: "#2196F3", borderRadius: 8, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5, },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 18 },
  // Styles for verification prompt
  verificationPromptContainer: {
    backgroundColor: '#FFFDE7', // Light yellow background
    borderWidth: 1,
    borderColor: '#FFD700', // Gold border
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  verificationPromptText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
    fontWeight: '500',
  },
  verifyButton: {
    marginTop: 10,
    padding: 15,
    backgroundColor: '#FF8C00', // Orange button
    borderRadius: 8,
    alignItems: 'center',
    width: '80%',
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 4,
  },
  reclaimInfoText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  verifiedStatusText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  verifiedStatusBadge: {
    backgroundColor: '#E8F5E9', // Light green
    color: '#28A745', // Dark green
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    fontWeight: 'bold',
    fontSize: 14,
  }
});


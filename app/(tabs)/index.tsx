import LoadingOverlay from "@/components/LoadingOverlay";
import MessageCard from "@/components/MessageCard";
import ShowMessage from "@/components/ShowMessageComponent"; // Import the new component
import { useDocuStore } from "@/hooks/useDocuStore";
import { useAbstraxionAccount, useAbstraxionClient, useAbstraxionSigningClient } from "@burnt-labs/abstraxion-react-native";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import HealthcareWorkerDashboard from "../healthWorkerDashboard";
import PatientDashboard from "../patientDashboard";


const DOCUSTORE_CONTRACT_ADDRESS = process.env.EXPO_PUBLIC_DOCUSTORE_CONTRACT_ADDRESS;

export default function Index() {
  const { data: account, login, logout, isConnected } = useAbstraxionAccount();
  const { client: signingClient } = useAbstraxionSigningClient();
  const { client: queryClient } = useAbstraxionClient();

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // The showMessage function is now handled by the ShowMessage component
  const showMessage = (msg: string) => {
    setMessage(msg);
  };

  const { userRole, linkedUUID, patientRecords, setLinkedUUID, setPatientRecords } =
    useDocuStore(queryClient!, account, DOCUSTORE_CONTRACT_ADDRESS, showMessage);

   const signingClientWrapper = {
    execute: (address: string, contract: string, msg: any, type: string) => {
      // The `fee` parameter is required by the original method, so we provide 'auto'.
      const fee = 'auto';
      // Now you can safely call `signingClient.execute` because it's not undefined.
      return signingClient!.execute(address, contract, msg, fee);
    },
  };

  const setLinkedUUIDWrapper = (uuid: string | undefined) => {
    // Only call setLinkedUUID if the uuid is a string
    if (uuid) {
      setLinkedUUID(uuid);
    }
};

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Zeru - Verifiable Medical Records</Text>
      <MessageCard message={message} />
      <ShowMessage message={message} setMessage={setMessage} />

      {isConnected && signingClientWrapper && queryClient && DOCUSTORE_CONTRACT_ADDRESS ? (
        userRole === "healthcare_worker" ? (
          <HealthcareWorkerDashboard {...{ account, signingClient: signingClientWrapper, queryClient, setLoading, showMessage: (msg: string, type?: "success" | "error" | "info") => setMessage(msg), contractAddress: DOCUSTORE_CONTRACT_ADDRESS }} />
        ) : (
          <PatientDashboard {...{ account, signingClient: signingClientWrapper, queryClient, linkedUUID, setLinkedUUID : setLinkedUUIDWrapper, patientRecords, setPatientRecords, setLoading, showMessage: (msg: string, type?: "success" | "error" | "info") => setMessage(msg), contractAddress: DOCUSTORE_CONTRACT_ADDRESS }} />
        )
      ) : (
        <TouchableOpacity onPress={login} style={styles.button}>
          <Text style={styles.buttonText}>Tap to login with Abstraxion</Text>
        </TouchableOpacity>
      )}

      <LoadingOverlay loading={loading} />
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
    color: "#333",
    textAlign: "center",
  },
  messageCard: {
    backgroundColor: "#e0f7fa",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    width: "90%",
    alignItems: "center",
    borderColor: "#00bcd4",
    borderWidth: 1,
  },
  messageText: {
    color: "#006064",
    fontSize: 16,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
    width: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    alignItems: "center",
    marginBottom: 20,
  },
  responseText: {
    color: "#000",
    marginTop: 5,
    fontSize: 16,
    textAlign: "center",
  },
  section: {
    width: "90%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    marginTop: 20,
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#424242",
    textAlign: "center",
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    color: "#616161",
  },
  label: {
    fontSize: 16,
    color: "#555",
    marginBottom: 5,
    textAlign: "center",
  },
  input: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#fdfdfd",
  },
  inlineInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
  },
  halfInput: {
    width: '45%',
    marginBottom: 0, // Override default margin for inline
  },
  slash: {
    fontSize: 20,
    color: '#555',
    marginHorizontal: 5,
  },
  button: {
    marginVertical: 10,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#2196F3",
    width: "80%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  logoutButton: {
    marginVertical: 20,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#F44336",
    width: "80%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  disabledButton: {
    backgroundColor: "#B0BEC5",
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    width: '100%',
    justifyContent: 'center',
  },
  toggleButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginHorizontal: 5,
    backgroundColor: '#e0e0e0',
  },
  toggleButtonActive: {
    backgroundColor: '#2196F3',
  },
  toggleButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  recordsContainer: {
    marginTop: 20,
    width: "100%",
    padding: 15,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    borderColor: "#e0e0e0",
    borderWidth: 1,
  },
  recordItem: {
    backgroundColor: "#ffffff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderColor: "#e0e0e0",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  recordText: {
    fontSize: 14,
    color: "#424242",
    marginBottom: 3,
  },
  recordTypeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#006064',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 5,
  },
  globalLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 150,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
});

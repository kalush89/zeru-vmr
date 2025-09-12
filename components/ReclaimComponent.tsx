import {
  useAbstraxionAccount,
  useAbstraxionSigningClient,
} from "@burnt-labs/abstraxion-react-native";
import { ReclaimVerification } from "@reclaimprotocol/inapp-rn-sdk";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const reclaimVerification = new ReclaimVerification();

const RUM_CONTRACT_ADDRESS = process.env.EXPO_PUBLIC_RUM_CONTRACT_ADDRESS ?? "";

const reclaimConfig = {
  appId: process.env.EXPO_PUBLIC_RECLAIM_APP_ID ?? "",
  appSecret: process.env.EXPO_PUBLIC_RECLAIM_APP_SECRET ?? "",
  doctorProviderId: process.env.EXPO_PUBLIC_DOCTOR_RECLAIM_PROVIDER_ID ?? "",
  communityHealthPractitionerProviderId: process.env.EXPO_PUBLIC_CHP_RECLAIM_PROVIDER_ID ?? "",
  nurseMidwifeProviderId: process.env.EXPO_PUBLIC_NURSE_MIDWIFE_RECLAIM_PROVIDER_ID ?? "",
};

type Status =
  | "idle"
  | "verifying"
  | "verification_complete"
  | "executing"
  | "complete"
  | "error";

const styles = StyleSheet.create({
  container: {
    gap: 15,
  },
  connectButtonContainer: {
    width: "100%",
    paddingHorizontal: 20,
    alignItems: "center",
  },
  fullWidthButton: {
    width: "100%",
    maxWidth: "100%",
  },
  menuButton: {
    padding: 15,
    borderRadius: 5,
    backgroundColor: "#ffffff",
    alignItems: "center",
    flex: 1,
    minWidth: 120,
    maxWidth: "48%",
  },
  buttonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "500",
  },
  disabledButton: {
    backgroundColor: "#333333",
    opacity: 0.6,
  },
  button: {
    backgroundColor: "#ffffff",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  statusContainer: {
    backgroundColor: "#111111",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333333",
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  infoContainer: {
    backgroundColor: "#111111",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333333",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 5,
  },
  infoText: {
    fontSize: 14,
    color: "#cccccc",
  },
});

interface ReclaimComponentProps {
  showMessage: (message: string, type?: "success" | "error" | "info") => void;
  healthWorkerRole: "doctor" | "community_health_practitioner" | "nurse_midwife";
}

export default function ReclaimComponent({ showMessage, healthWorkerRole }: ReclaimComponentProps) {
  const { client } = useAbstraxionSigningClient();
  const {
    data: account,
    isConnected,
    login,
    isConnecting,
  } = useAbstraxionAccount();

  const [queryResult, setQueryResult] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<Status>("idle");
  const [loading, setLoading] = useState(false);

  const queryRUMContract = async () => {
    if (!client) {
      console.log("Client not available for query");
      return;
    }

    try {
      const queryMsg = {
        get_value_by_user: {
          address: account?.bech32Address,
        },
      };

      const result: string = await client.queryContractSmart(
        RUM_CONTRACT_ADDRESS,
        queryMsg
      );

      // Parse the string result to number, handling quoted strings
      const cleanResult = result.replace(/"/g, ""); // Remove quotes
      const parsedResult = parseInt(cleanResult, 10);
      setQueryResult(isNaN(parsedResult) ? undefined : parsedResult);
    } catch (error) {
      console.log("Error querying RUM contract:", error);
      // Don't show alert for initial query, just log the error
    }
  };

  // Query on mount when client is available
  useEffect(() => {
    if (client) {
      queryRUMContract();
    }
  }, [client]);

  const startVerificationFlow = async () => {
    if (!account?.bech32Address) {
      Alert.alert("Error", "Please connect your wallet first");
      return;
    }

    if (!client) {
      Alert.alert("Error", "Client not found");
      return;
    }

    // Clear previous state if retrying after error
    if (status === "error") {
      setQueryResult(undefined);
    }

    setLoading(true);
    setStatus("verifying");

    try {
      // Step 1: Verify with Reclaim
      let providerId: string;
      switch (healthWorkerRole) {
        case "doctor":
          providerId = reclaimConfig.doctorProviderId;
          break;
        case "community_health_practitioner":
          providerId = reclaimConfig.communityHealthPractitionerProviderId;
          break;
        case "nurse_midwife":
          providerId = reclaimConfig.nurseMidwifeProviderId;
          break;
        default:
          throw new Error("Invalid healthWorkerRole provided");
      }

      const verificationResult = await reclaimVerification.startVerification({
        appId: reclaimConfig.appId,
        secret: reclaimConfig.appSecret,
        providerId: providerId,
      });

      console.log("Verification result:", verificationResult);
      setStatus("verification_complete");

      // Step 2: Execute RUM contract
      setStatus("executing");
      const claimInfo = {
        provider: verificationResult.proofs[0].claimData.provider,
        parameters: verificationResult.proofs[0].claimData.parameters,
        context: verificationResult.proofs[0].claimData.context,
      };

      const signedClaim = {
        claim: {
          identifier: verificationResult.proofs[0].claimData.identifier,
          owner: verificationResult.proofs[0].claimData.owner,
          epoch: verificationResult.proofs[0].claimData.epoch,
          timestampS: verificationResult.proofs[0].claimData.timestampS,
        },
        signatures: verificationResult.proofs[0].signatures,
      };

      const executeMsg = {
        update: {
          value: {
            proof: {
              claimInfo: claimInfo,
              signedClaim: signedClaim,
            },
          },
        },
      };

      const executeResult = await client.execute(
        account?.bech32Address,
        RUM_CONTRACT_ADDRESS,
        executeMsg,
        "auto"
      );

      console.log("RUM contract executed:", executeResult);

      setStatus("complete");

      // Step 3: Query the contract to show updated results
      await queryRUMContract();

      Alert.alert(
        "Success",
        "Complete verification flow finished successfully!"
      );
    } catch (error) {
      console.log("Error in verification flow:", error);
      setStatus("error");

      if (error instanceof ReclaimVerification.ReclaimVerificationException) {
        switch (error.type) {
          case ReclaimVerification.ExceptionType.Cancelled:
            showMessage("Verification was cancelled", "error");
            break;
          case ReclaimVerification.ExceptionType.Dismissed:
            showMessage("Verification was dismissed", "error");
            break;
          case ReclaimVerification.ExceptionType.SessionExpired:
            showMessage("Verification session expired", "error");
            break;
          case ReclaimVerification.ExceptionType.Failed:
          default:
            showMessage("Verification failed", "error");
        }
      } else if (error instanceof Error) {
        showMessage(error.message, "error");
      } else {
        showMessage("An unknown error occurred during the verification flow", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "idle":
        return "Ready to start verification";
      case "verifying":
        return "Verifying with Reclaim Protocol...";
      case "verification_complete":
        return "✓ Verification completed";
      case "executing":
        return "Executing RUM contract...";
      case "complete":
        return "✓ Complete verification flow finished!";
      case "error":
        return "❌ Error occurred";
      default:
        return "Unknown status";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "idle":
        return "#cccccc";
      case "verifying":
      case "executing":
        return "#ffaa00";
      case "verification_complete":
      case "complete":
        return "#4caf50";
      case "error":
        return "#ff4444";
      default:
        return "#cccccc";
    }
  };

  const isButtonDisabled = () => {
    return loading || status === "complete";
  };

  const getButtonText = () => {
    if (loading) {
      return "Processing...";
    }
    if (status === "complete") {
      return "Verification Complete";
    }
    if (status === "error") {
      return "Retry Verification";
    }
    return "Start Verification Flow";
  };

  return (
    <View style={styles.container}>
      {!isConnected ? (
        <View style={styles.connectButtonContainer}>
          <TouchableOpacity
            onPress={login}
            style={[
              styles.menuButton,
              styles.fullWidthButton,
              isConnecting && styles.disabledButton,
            ]}
            disabled={isConnecting}
          >
            <Text style={styles.buttonText}>
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TouchableOpacity
            style={[styles.button, isButtonDisabled() && styles.disabledButton]}
            onPress={startVerificationFlow}
            disabled={isButtonDisabled()}
          >
            <Text style={styles.buttonText}>{getButtonText()}</Text>
          </TouchableOpacity>
          <View style={styles.statusContainer}>
            <Text style={styles.statusTitle}>Status:</Text>
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
          </View>
          {queryResult !== undefined && (
            <View style={styles.infoContainer}>
              <Text style={styles.infoTitle}>Verified Followers:</Text>
              <Text style={styles.infoText}>{queryResult}</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}
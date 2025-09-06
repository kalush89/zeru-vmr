// hooks/useDocuStore.js
import { HealthRecords } from "@/scripts/types";
import {
  AbstraxionAccount
} from "@burnt-labs/abstraxion-react-native";
import { useEffect, useState } from "react";
import { retryOperation } from "../scripts/retry";




export function useDocuStore(
    queryClient: { queryContractSmart: (address: string, query: any) => Promise<any> },
    account: AbstraxionAccount | undefined,
    contractAddress: string | undefined,
    showMessage: (message: string, type?: string) => void
) {

  
  const [userRole, setUserRole] = useState("none");
  const [linkedUUID, setLinkedUUID] = useState("");
  const [patientRecords, setPatientRecords] = useState<HealthRecords[]>([]);

  useEffect(() => {
    if (queryClient && account?.bech32Address) {
      checkUserRole(account.bech32Address);
    } else {
      resetState();
    }
  }, [account?.bech32Address]);

  function resetState() {
    setUserRole("none");
    setLinkedUUID("");
    setPatientRecords([]);
  }

  async function checkUserRole(address: string) {
    try {
      const roleResponse = await retryOperation(() =>
        queryClient.queryContractSmart(contractAddress as string, {
          UserDocument: { owner: address, collection: "roles", document: address },
        })
      );

      if (roleResponse?.document) {
        const data = JSON.parse(roleResponse.document.data);
        setUserRole(data.role);
        showMessage(`Logged in as ${data.role}.`);
      } else {
        setUserRole("patient");
        showMessage("Logged in as Patient (no role found).");
      }
    } catch (err) {
      console.error(err);
      setUserRole("patient");
      showMessage("Defaulted to Patient due to error.", "warning");
    }
  }

  return { userRole, linkedUUID, setLinkedUUID, patientRecords, setPatientRecords };
}

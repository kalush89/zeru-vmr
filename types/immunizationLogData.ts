export interface ImmunizationLogData {
  id: string;
  timestamp: string;
  patientFirstName: string;
  patientLastName: string;
  vaccineType: string;
  doseNumber: string;
  administeredBy: string;
  notes?: string;
  signature?: string;
  status: string;
}
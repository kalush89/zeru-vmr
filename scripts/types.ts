// scripts/types.ts

/**
 * Represents a Healthcare Worker's profile stored in the DocuStore 'HWProfiles' collection.
 * This data would be set by the Facility Admin.
 */
export interface HWProfile {
  id: string; // Document ID (usually same as bech32Address)
  bech32Address: string; // The HW's blockchain address
  name: string; // Full name of the Healthcare Worker
  job_title: string; // e.g., "Doctor", "Nurse", "Community Health Practitioner"
  sex: string; // HW's sex
  facilityId: string; // ID of the linked facility
  facilityName: string; // Name of the linked facility
  is_license_verified?: boolean; // NEW: True if HW's professional license is zkTLS-verified
  // Add other relevant fields like professional license number, contact info, etc.
}

/**
 * Represents a single patient health record document stored in the DocuStore 'health_records' collection.
 * This interface combines all possible fields for both Antenatal and Immunization records.
 * Sensitive fields are expected to be encrypted before storage.
 */
export interface HealthRecords { // Renamed from PatientRecord to match your import alias
  record_type: 'Antenatal' | 'Immunization'; // Indicates if it's an antenatal visit or an immunization record
  id: string; // Unique ID for this specific record entry (different from UUID)

  // Core Identifiers and Demographics (often encrypted for privacy)
  uuid: string; // Unique identifier for the patient's entire record set
  patient_firstname: string; // Patient's first name (expected to be encrypted)
  patient_lastname: string; // Patient's last name (expected to be encrypted)
  patient_sex: string;   // Patient's sex (e.g., "Female", expected to be encrypted)
  date_of_birth?: string; // Patient's date of birth (e.g., "YYYY-MM-DD", expected to be encrypted, optional)

  // Antenatal Vitals (example fields - specific to 'Antenatal' records)
  bp?: string; // Blood Pressure, e.g., "120/80 mmHg"
  weight?: string; // Weight, e.g., "65.5 kg"
  fundal_height?: string; // Fundal height, e.g., "28 cm"
  test_results?: string; // General test results, e.g., "Hemoglobin: 12 g/dL"

  // Immunization Specific Fields (specific to 'Immunization' records)
  vaccine_type?: string; // Type of vaccine, e.g., "MMR"
  date_administered?: string; // Date vaccine was given, e.g., "YYYY-MM-DD"
  batch_number?: string; // Vaccine batch number
  next_dose_date?: string; // Date for the next dose (optional)
  zk_registry_verified?: boolean; // True if vaccine batch was zkTLS-verified against a registry

  // Provenance (who created the record)
  created_by_hw_address: string; // Blockchain address of the HW who created the record
  created_by_hw_name: string; // Name of the HW who created the record
  created_by_hw_facility: string; // Facility where the record was created
  created_by_hw_is_license_verified?: boolean; // True if the HW's license was verified at record creation
  timestamp: string; // ISO 8601 string of when the record was created
}

/**
 * Represents the structure of a single document returned by the DocuStore query.
 */
export interface DocuStoreDocument {
  id: string; // Document ID
  data: string; // JSON string representing the HealthRecords
  // ... other potential DocuStore metadata fields like owner, created_at, updated_at
}

/**
 * Represents the full response from querying the DocuStore contract for a single document.
 * Used for fetching HWProfile.
 */
export interface DocuStoreSingleDocumentResponse {
  document?: DocuStoreDocument; // Single DocuStore document
}

/**
 * Represents the full response from querying the DocuStore contract for multiple documents.
 * Used for fetching patient records.
 */
export interface DocuStoreQueryResponse {
  documents?: DocuStoreDocument[]; // Array of DocuStore documents
}
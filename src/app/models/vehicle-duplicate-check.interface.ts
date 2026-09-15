export interface VehicleDuplicateCheckResponse {
  isDuplicate: boolean;
  isVehicleNumberExists: boolean;
  isEngineNumberExists: boolean;
  isChassisNumberExists: boolean;
  totalDuplicatesFound: number;
  existingRecords: ExistingVehicleRecord[];
  messages: string[];
  // ✅ ADD THIS
  averageValuationAmount?: number;
}

export interface ExistingVehicleRecord {
  valuationId: string;
  vehicleNumber: string;
  engineNumber?: string;
  chassisNumber?: string;
  status: string;
  createdDate: string;
  matchedField: string;
  // ✅ ADD THESE
  company?: string;
  valuationAmount?: number;
  /**
   * Which company the matching case belongs to: 'vehga' | 'pronto'.
   *
   * Dedupe searches across both companies, so a match is not necessarily in the
   * one you are working in. Not the same as `company` above, which is the
   * stakeholder's name.
   */
  brand?: string;
}

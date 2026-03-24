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
}

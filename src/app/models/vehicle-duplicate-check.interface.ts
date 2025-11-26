export interface VehicleDuplicateCheckResponse {
  isDuplicate: boolean;
  isVehicleNumberExists: boolean;
  isEngineNumberExists: boolean;
  isChassisNumberExists: boolean;
  totalDuplicatesFound: number;
  existingRecords: ExistingVehicleRecord[];
  messages: string[];
}

export interface ExistingVehicleRecord {
  valuationId: string;
  vehicleNumber: string;
  engineNumber?: string;
  chassisNumber?: string;
  status: string;
  createdDate: string;
  matchedField: string;
}

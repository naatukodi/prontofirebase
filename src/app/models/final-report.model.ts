import { Stakeholder } from './stakeholder.model';
import { DocumentInfo } from './VehicleDetails';
import { VehicleDetails } from './VehicleDetails';
import { Inspection } from './Inspection';
import { QualityControl } from './QualityControl';
import { ValuationEstimate } from './ValuationEstimate';

export interface PhotoUrls {
  FrontLeftSide: string;
  FrontRightSide: string;
  RearLeftSide: string;
  RearRightSide: string;
  FrontViewGrille: string;
  RearViewTailgate: string;
  DriverSideProfile: string;
  PassengerSideProfile: string;
  Dashboard: string;
  InstrumentCluster: string;
  EngineBay: string;
  VinPlate: string;
  ChassisImprint: string;
  GearInterior: string;
  FrontSeat: string;
  RearSeat: string;
  DashboardCloseup: string;
  Odometer: string;
  SelfieWithVehicle: string;
  Underbody: string;
  TireFrontLeft: string;
  TireFrontRight: string;
  TireRearLeft: string;
  TireRearRight: string;
  ChassisVerification: string;
  ChassisStencilTrace: string;
  WorkingOperationPhoto: string;
}

export interface WorkflowStep {
  stepOrder: number;
  templateStepId: number;
  assignedToRole: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface FinalReport {
  id: string;
  stakeholder: Stakeholder;
  compositeKey: string;
  vehicleNumber: string;
  applicantContact: string;
  vehicleSegment: string | null;
  documents: DocumentInfo[] | null;
  vehicleDetails: VehicleDetails;
  createdAt: string;
  updatedAt: string;
  inspectionDetails: Inspection;
  qualityControl: QualityControl;
  valuationResponse: ValuationEstimate;
  photoUrls: PhotoUrls;
  workflow: WorkflowStep[];
  status: string;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: string | null;
  deletedBy: string | null;
  completedAt: string | null;
  completedBy: string | null;
  assignedTo: string | null;
  assignedToRole: string | null;
  remarks?: string;
}

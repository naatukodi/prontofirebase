import { Stakeholder } from './stakeholder.model';
import { DocumentInfo } from './VehicleDetails';
import { VehicleDetails } from './VehicleDetails';
import { Inspection } from './Inspection';
import { QualityControl } from './QualityControl';
import { ValuationEstimate } from './ValuationEstimate';

/**
 * Per-photo capture details, keyed the same way as PhotoUrls. Written by the upload
 * service from what the camera app stamped on the frame, so it is the inspector's own
 * device reading rather than something re-derived later.
 */
export interface PhotoMeta {
  capturedDate?: string | null;
  locationText?: string | null;
  annotationNote?: string | null;
  originalPhotoUrl?: string | null;
}

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
  photoMetadata?: Record<string, PhotoMeta>;
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

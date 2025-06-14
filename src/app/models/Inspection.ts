// src/app/models/Inspection.ts
export interface Inspection {
  vehicleInspectedBy: string;
  dateOfInspection: string;      // ISO date‐time string
  inspectionLocation: string;
  vehicleMoved: boolean;
  engineStarted: boolean;
  odometer: number;
  vinPlate: boolean;
  bodyType: string;
  overallTyreCondition: string;
  otherAccessoryFitment: boolean;
  windshieldGlass: string;
  roadWorthyCondition: boolean;
  engineCondition: string;
  suspensionSystem: string;
  steeringAssy: string;
  brakeSystem: string;
  chassisCondition: string;
  bodyCondition: string;
  batteryCondition: string;
  paintWork: string;
  clutchSystem: string;
  gearBoxAssy: string;
  propellerShaft: string;
  differentialAssy: string;
  cabin: string;
  dashboard: string;
  seats: string;
  headLamps: string;
  electricAssembly: string;
  radiator: string;
  intercooler: string;
  allHosePipes: string;
  photos: string[];             // array of URLs
}

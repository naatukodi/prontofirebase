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
  steeringSystem: string;
  fuelSystem: string;
  tyreCondition: string;
  exteriorCondition: string;
  interiorCondition: string;
  electricalSystem: string;
  gearboxAssembly: string;
  driveShafts: string;
  interCooler: string;
  allGlasses: string;
  steeringWheel: string;
  steeringColumn: string;
  steeringBox: string;
  steeringLinkages: string;
  bonnet: string;
  mudguards: string;
  boom: string;
  bucket: string;
  chainTrack: string;
  hydraulicCylinders: string;
  swingUnit: string;
  upholestry: string;
  interiorTrims: string;
  front: string;
  rear: string;
  axles: string;
  airConditioner: string;
  audio: string;
  photos: string[];             // array of URLs
  remarks?: string;

  // Body & Structure
  speedoMeter?: string;
  frontAxles?: string;
  rearAxles?: string;
  steeringHandle?: string;
  frontForkAssy?: string;
  frontFairing?: string;
  rearCowls?: string;
  bumpers?: string;
  doors?: string;
  fenders?: string;
  rightSideWing?: string;
  leftSideWing?: string;
  tailGate?: string;
  loadFloor?: string;

  // Brakes Additional
  parkingBrake?: string;
  abs?: string;

  // Electrical Additional
  tailLightsIndicators?: string;
  wiringAssy?: string;

  // Crash Guards
  frontCrashGuard?: string;
  rearCrashGuard?: string;

  // 4W Specific
  airBags?: string;
  sunRoof?: string;
  sideFenders?: string;

  // CV Specific
  hydraulicLift?: string;
  sideUnderRunProtection?: string;

  // 2W Specific
  mainStand?: string;
  sideStand?: string;
  frontMudGuard?: string;
  rearMudGuard?: string;
  fuelTankCondition?: string;
  chainSprocket?: string;
  frontBrakeCondition?: string;
  rearBrakeCondition?: string;
  headLight?: string;
  tailLight?: string;
  indicators?: string;
  hornCondition?: string;
  mirrorCondition?: string;
  seatCondition?: string;
  handleBarGrips?: string;
  footRest?: string;
  alloyWheelRim?: string;

  // CE Specific
  retarder?: string;
  differentialLock?: string;
  pto?: string;
  hydraulicSystem?: string;
  boomArm?: string;
  bucketCondition?: string;
  bladeCondition?: string;
  liftingCapacity?: string;
  tyreConditionCe?: string;
  underCarriage?: string;
  crawlerTracks?: string;
  steelRims?: string;
  attachmentCondition?: string;
  cabCondition?: string;
  counterWeight?: string;
  rockBreaker?: string;

  // BUS Specific
  coachCondition?: string;
  passengerSeats?: string;
  emergencyExits?: string;
  luggageCompartment?: string;
  acSystem?: string;
  destinationBoard?: string;
  sideMirrors?: string;

  // FE / Tractor Specific
  rightIndividualBrakes?: string;
  leftIndividualBrakes?: string;
  threePointLinkage?: string;
  powerTakeOff?: string;
  hitchSystem?: string;
  hydraulicLiftFe?: string;
  frontWeights?: string;
  rearWeights?: string;
  ropsCanopy?: string;
  frontTyreCondition?: string;
  rearTyreCondition?: string;
  implementAttachments?: string;
  fuelTankFe?: string;
  frontAxleFe?: string;
  rearDrawbar?: string;
}

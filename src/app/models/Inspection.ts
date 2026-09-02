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
  transmissionType: string;
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
  upholstery: string;
  interiorTrims: string;
  front: string;
  rear: string;
  axles: string;
  airConditioner: string;
  audio: string;
  photos: string[];             // array of URLs
  chassisVerificationPhotoUrl?: string;
  chassisStencilTracePhotoUrl?: string;
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

  // Excel-registry aligned fields
  loadBodyAssy?: string;
  bodyAssy?: string;
  cabinAssy?: string;
  frontBrakes?: string;
  rearBrakes?: string;
  headLights?: string;
  frontSuspension?: string;
  rearSuspension?: string;
  rightSideGate?: string;
  leftSideGate?: string;
  frontScoop?: string;
  rvMirrors?: string;
  lockSet?: string;
  sideCovers?: string;
  bellyPanels?: string;
  brakeLeversFluid?: string;
  silencer?: string;
  silencerCover?: string;
  accelerator?: string;
  handleBar?: string;
  steeringStem?: string;
  frontShockAbsorber?: string;
  rearShockAbsorber?: string;
  legGuard?: string;
  sareeGuard?: string;
  chainGuard?: string;
  selfStart?: string;
  horn?: string;
  kickPedalFootRest?: string;
  frontPanel?: string;
  frontGlassFrame?: string;
  switches?: string;
  loadCarrier?: string;
  steeringControlSystem?: string;
  cabinStructure?: string;
  dashboardControls?: string;
  glassPanels?: string;
  bucketBlade?: string;
  pinsAndBushes?: string;
  serviceBrake?: string;
  emergencyStop?: string;
  sensors?: string;
  steeringControlLevers?: string;
  hydraulicSteeringPump?: string;
  swivelJoints?: string;
  hydraulicOilCooler?: string;
  hydraulicPump?: string;
  hosesAndFittings?: string;
  swingMechanism?: string;
  trackChains?: string;
  sprockets?: string;
  rollers?: string;
  hourMeter?: string;
  bonnetGuard?: string;
  torqueConverter?: string;
  finalDrive?: string;
  bodyStructure?: string;
  driverCabin?: string;
  bumpersAndGrilles?: string;
  seatsAndBerths?: string;
  sideBodyPanels?: string;
  rearBodyPanels?: string;
  operatorPlatform?: string;
  operatorStation?: string;
  canopy?: string;
  frontGrilles?: string;
  brakeEqualization?: string;
  fanAssy?: string;
  rearAxleFe?: string;
  tieRodsJoints?: string;
  muffler?: string;
  airFilter?: string;
  dropArm?: string;
  attachmentHitch?: string;
}

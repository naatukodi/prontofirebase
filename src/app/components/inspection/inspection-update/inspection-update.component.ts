// src/app/valuation-inspection-update/inspection-update.component.ts

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { switchMap, take, catchError } from 'rxjs/operators';
import { Observable, Subscription, of, firstValueFrom } from 'rxjs';
import { RouterModule } from '@angular/router';
import { Auth, User, authState } from '@angular/fire/auth';

// Services
import { InspectionService } from '../../../services/inspection.service';
import { VehicleInspectionService } from '../../../services/vehicle-inspection.service';
import { WorkflowService } from '../../../services/workflow.service';
import { QualityControlService } from '../../../services/quality-control.service';
import { HistoryLoggerService } from '../../../services/history-logger.service';
import { StakeholderService } from '../../../services/stakeholder.service';

// Models
import { Inspection } from '../../../models/Inspection';

// Field registry
import {
  getFieldRegistry, normalizeVehicleType,
  CONDITION_OPTIONS, YES_NO_OPTIONS,
  InspectionSection
} from '../../../shared/inspection-field-registry';

// Components
import { SharedModule } from '../../shared/shared.module/shared.module';
import { WorkflowButtonsComponent } from '../../workflow-buttons/workflow-buttons.component';

type ValuationType = 'four-wheeler' | 'cv' | 'two-wheeler' | 'three-wheeler' | 'tractor' | 'ce' | 'bus';

@Component({
  selector: 'app-valuation-inspection-update',
  standalone: true,
  imports: [SharedModule, WorkflowButtonsComponent, RouterModule],
  templateUrl: './inspection-update.component.html',
  styleUrls: ['./inspection-update.component.scss']
})
export class InspectionUpdateComponent implements OnInit, OnDestroy {
  valuationId!: string;
  vehicleNumber!: string;
  applicantContact!: string;
  valuationType: ValuationType | null = null;
  maxDate: string = '';

  form!: FormGroup;
  loading = true;
  error: string | null = null;
  saving = false;
  saveInProgress = false;
  submitInProgress = false;
  saved = false;

  // [ADDED FOR PDF READ-ONLY VIEW]
  isViewOnly: boolean = false; 

  inspection: Inspection | null = null;
  photoFiles: File[] = [];

  readonly conditionOptions = CONDITION_OPTIONS;
  readonly yesNoOptions = YES_NO_OPTIONS;

  // Resolved vehicle type: falls back to the stakeholder's vehicleSegment when
  // valuationType (e.g. "Retail") doesn't map to a vehicle type.
  effectiveVehicleType: string | null = null;

  // Maps normalized registry keys to visibilityMap keys
  private static readonly VISIBILITY_KEY: Record<string, string> = {
    '4w': 'four-wheeler',
    'cv': 'cv',
    '2w': 'two-wheeler',
    '3w': 'three-wheeler',
    'fe': 'tractor',
    'ce': 'ce',
    'bus': 'bus'
  };

  private get visibilityKey(): string | null {
    const vk = normalizeVehicleType(this.effectiveVehicleType ?? this.valuationType);
    return vk ? (InspectionUpdateComponent.VISIBILITY_KEY[vk] ?? null) : null;
  }

  get registrySections(): InspectionSection[] {
    const vk = normalizeVehicleType(this.effectiveVehicleType ?? this.valuationType);
    if (!vk) return [];
    return getFieldRegistry(vk);
  }

  private assignedTo = '';
  private assignedToPhoneNumber = '';
  private assignedToEmail = '';
  private assignedToWhatsapp = '';

  // Tracking
  private currentUser: User | null = null;
  private currentUserId: string = 'unknown';
  private currentUserName: string = 'Unknown User';
  private originalFormData: any = {};

  // Mandatory photo validation state
  isSaving: boolean = false;
  mandatoryPhotosError: string | null = null;
  missingPhotos: string[] = [];

  private visibilityMap: Record<string, string[]> = {
    'four-wheeler': [
      'vehicleInspectedBy','inspectionDate','inspectionLocation','frontPhoto','odometer','bodyType','engineCondition',
      'chassisCondition','steeringSystem','brakeSystem','suspensionSystem','fuelSystem',
      'tyreCondition','bodyCondition','cabinCondition','exteriorCondition','interiorCondition',
      'gearboxAssembly','clutchSystem','driveShafts','propellerShaft','differentialAssy',
      'radiator','interCooler','allHosePipes','paintWork','vinPlate','vehicleMoved','engineStarted','roadWorthyCondition','otherAccessoryFitment',
      'parkingBrake','abs','tailLightsIndicators','wiringAssy','frontCrashGuard','rearCrashGuard',
      'airBags','sunRoof','sideFenders','headLamps','batteryCondition'
    ],
    'cv': [
      'vehicleInspectedBy','inspectionDate','inspectionLocation','frontPhoto','odometer','bodyType','engineCondition',
      'chassisCondition','steeringSystem','brakeSystem','electricAssembly','suspensionSystem',
      'fuelSystem','tyreCondition','bodyCondition','cabinCondition','exteriorCondition',
      'interiorCondition','gearboxAssembly','clutchSystem','propellerShaft','differentialAssy',
      'radiator','interCooler','allHosePipes','steeringWheel','steeringColumn','steeringBox',
      'steeringLinkages','bumpers','doors','mudguards','allGlasses','dashboard','seats',
      'upholstery','interiorTrims','front','rear','axles','airConditioner','audio','paintWork',
      'rightSideWing','leftSideWing','tailGate','loadFloor','vinPlate','vehicleMoved','engineStarted','roadWorthyCondition','otherAccessoryFitment',
      'parkingBrake','abs','tailLightsIndicators','wiringAssy','frontCrashGuard','rearCrashGuard',
      'hydraulicLift','sideUnderRunProtection','headLamps','batteryCondition','sunRoof','airBags'
    ],
    'two-wheeler': [
      'vehicleInspectedBy','inspectionDate','inspectionLocation','frontPhoto','odometer','bodyType','engineCondition',
      'chassisCondition','steeringSystem','brakeSystem','electricAssembly','suspensionSystem',
      'fuelSystem','tyreCondition','bodyCondition','exteriorCondition','gearboxAssembly',
      'clutchSystem','steeringHandle','frontForkAssy','mudguards','frontFairing','rearCowls',
      'seats','speedoMeter','front','rear','paintWork','vinPlate','vehicleMoved','engineStarted','roadWorthyCondition','otherAccessoryFitment',
      'mainStand','sideStand','frontMudGuard','rearMudGuard','fuelTankCondition','chainSprocket',
      'frontBrakeCondition','rearBrakeCondition','headLight','tailLight','indicators',
      'hornCondition','mirrorCondition','seatCondition','handleBarGrips','footRest','alloyWheelRim'
    ],
    'three-wheeler': [
      'vehicleInspectedBy','inspectionDate','inspectionLocation','frontPhoto','odometer','bodyType','engineCondition',
      'chassisCondition','steeringSystem','brakeSystem','electricAssembly','suspensionSystem',
      'fuelSystem','tyreCondition','bodyCondition','cabinCondition','exteriorCondition',
      'interiorCondition','gearboxAssembly','clutchSystem','driveShafts','radiator','interCooler',
      'allHosePipes','steeringColumn','steeringBox','steeringLinkages','steeringHandle',
      'frontForkAssy','mudguards','allGlasses','dashboard','seats','upholstery','interiorTrims',
      'front','rear','axles','airConditioner','audio','paintWork','vinPlate','vehicleMoved','engineStarted','roadWorthyCondition','otherAccessoryFitment',
      'parkingBrake','abs','tailLightsIndicators','wiringAssy','frontCrashGuard','rearCrashGuard'
    ],
    'tractor': [
      'vehicleInspectedBy','inspectionDate','inspectionLocation','frontPhoto','odometer','bodyType','engineCondition',
      'chassisCondition','steeringSystem','brakeSystem','electricAssembly','suspensionSystem',
      'fuelSystem','tyreCondition','bodyCondition','exteriorCondition','gearboxAssembly',
      'clutchSystem','differentialAssy','radiator','interCooler','allHosePipes','steeringWheel',
      'steeringColumn','steeringBox','steeringLinkages','bonnet','bumpers','mudguards','seats',
      'front','rear','axles','paintWork','vinPlate','vehicleMoved','engineStarted','roadWorthyCondition','otherAccessoryFitment',
      'rightIndividualBrakes','leftIndividualBrakes','threePointLinkage','powerTakeOff',
      'hitchSystem','hydraulicLiftFe','frontWeights','rearWeights','ropsCanopy',
      'frontTyreCondition','rearTyreCondition','implementAttachments','fuelTankFe','frontAxleFe','rearDrawbar'
    ],
    'ce': [
      'vehicleInspectedBy','inspectionDate','inspectionLocation','frontPhoto','odometer','bodyType','engineCondition',
      'chassisCondition','steeringSystem','brakeSystem','electricAssembly','suspensionSystem',
      'fuelSystem','tyreCondition','bodyCondition','cabinCondition','exteriorCondition',
      'interiorCondition','gearboxAssembly','clutchSystem','radiator','interCooler','allHosePipes',
      'steeringWheel','steeringColumn','steeringBox','steeringLinkages','bonnet','mudguards',
      'allGlasses','boom','bucket','chainTrack','hydraulicCylinders','swingUnit','dashboard',
      'seats','upholstery','interiorTrims','front','rear','axles','airConditioner','paintWork','vinPlate','vehicleMoved','engineStarted','roadWorthyCondition','otherAccessoryFitment',
      'retarder','differentialLock','pto','hydraulicSystem','boomArm','bucketCondition',
      'bladeCondition','liftingCapacity','tyreConditionCe','underCarriage','crawlerTracks',
      'steelRims','attachmentCondition','cabCondition','counterWeight','rockBreaker'
    ],
    'bus': [
      'vehicleInspectedBy','inspectionDate','inspectionLocation','frontPhoto','odometer','bodyType','engineCondition',
      'chassisCondition','steeringSystem','brakeSystem','electricAssembly','suspensionSystem',
      'fuelSystem','tyreCondition','bodyCondition','cabinCondition','exteriorCondition',
      'interiorCondition','gearboxAssembly','clutchSystem','propellerShaft','differentialAssy',
      'radiator','interCooler','allHosePipes','steeringWheel','steeringColumn','steeringBox',
      'steeringLinkages','bumpers','doors','mudguards','allGlasses','dashboard','seats',
      'upholstery','interiorTrims','front','rear','axles','airConditioner','audio','paintWork',
      'vinPlate','vehicleMoved','engineStarted','roadWorthyCondition','otherAccessoryFitment',
      'parkingBrake','abs','tailLightsIndicators','wiringAssy','frontCrashGuard','rearCrashGuard',
      'coachCondition','passengerSeats','emergencyExits','luggageCompartment','acSystem','destinationBoard','sideMirrors'
    ]
  };

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private inspectionSvc: InspectionService,
    private vehicleInspectionService: VehicleInspectionService,
    private workflowSvc: WorkflowService,
    private qualityControlSvc: QualityControlService,
    private _snackBar: MatSnackBar,
    private auth: Auth,
    private historyLogger: HistoryLoggerService,
    private stakeholderSvc: StakeholderService,
    // The app is zoneless: work resumed after an await is not an event-listener
    // turn, so state set there needs an explicit nudge to reach the view.
    private cdr: ChangeDetectorRef
  ) {}

  private resolveVehicleType(): void {
    this.effectiveVehicleType = this.valuationType;
    if (normalizeVehicleType(this.valuationType)) return;

    this.stakeholderSvc
      .getStakeholder(this.valuationId, this.vehicleNumber, this.applicantContact)
      .pipe(take(1), catchError(() => of(null)))
      .subscribe(s => {
        const seg = (s as any)?.vehicleSegment;
        if (seg && normalizeVehicleType(seg)) {
          this.effectiveVehicleType = seg;
        }
      });
  }

  ngOnInit(): void {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2,'0');
    const dd = String(today.getDate()).padStart(2,'0');
    this.maxDate = `${yyyy}-${mm}-${dd}`;

    this.valuationId = this.route.snapshot.paramMap.get('valuationId')!;
    
    // GET CURRENT USER INFO
    authState(this.auth).pipe(take(1)).subscribe(u => {
      this.currentUser = u;
      if (u) {
        this.currentUserId = u.uid || u.phoneNumber || 'unknown';
        this.currentUserName = u.displayName || u.email?.split('@')[0] || 'Unknown User';
      }
      this.applyAssignedFromUser(u);
    });

    this.route.queryParamMap.subscribe(params => {
      const vn = params.get('vehicleNumber');
      const ac = params.get('applicantContact');
      this.valuationType = params.get('valuationType') as ValuationType | null;

      // [ADDED FOR PDF READ-ONLY VIEW] Check if 'viewOnly' is passed in the URL
      this.isViewOnly = params.get('viewOnly') === 'true';

      if (vn && ac) {
        this.vehicleNumber = vn;
        this.applicantContact = ac;
        this.resolveVehicleType();
        this.initForm();
        this.loadInspection();
      } else {
        this.loading = false;
        this.error = 'Missing vehicleNumber or applicantContact in query parameters.';
      }
    });
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  showField(key: string): boolean {
    const k = this.visibilityKey;
    return !!(k && this.visibilityMap[k]?.includes(key));
  }

  /** Returns true if at least one key in the list is visible for the current vehicle type. */
  hv(keys: string[]): boolean {
    return keys.some(k => this.showField(k));
  }

  private applyAssignedFromUser(u: User | null): void {
    const name = (u?.displayName?.trim() || '') || (u?.email ? u.email.split('@')[0] : '') || (u?.phoneNumber || '') || 'User';
    this.assignedTo = name;
    this.assignedToPhoneNumber = u?.phoneNumber || '';
    this.assignedToEmail = u?.email || '';
    this.assignedToWhatsapp = u?.phoneNumber || '';
  }

  // ✅ HELPER: Date Converters
  private toLocalDateTimeInput(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // Converts any ISO string (with or without Z/offset) to YYYY-MM-DD in LOCAL (IST) timezone
  private toLocalDateOnly(isoString?: string | null): string {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString.slice(0, 10);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private toIsoUtc(datetimeLocal: string): string {
    if (!datetimeLocal) return new Date().toISOString();
    const date = new Date(datetimeLocal);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString();
  }

  private initForm() {
    this.form = this.fb.group({
      vehicleInspectedBy: ['', Validators.required],
      dateOfInspection: ['', [Validators.required, this.pastOrTodayValidator()]],
      inspectionLocation: ['', Validators.required],
      vehicleMoved: [false],
      engineStarted: [false],
      odometer: [0, Validators.min(0)],
      vinPlate: [false],
      bodyType: [''],
      overallTyreCondition: [''],
      otherAccessoryFitment: [false],
      windshieldGlass: [''],
      roadWorthyCondition: [false],
      engineCondition: [''],
      suspensionSystem: [''],
      steeringSystem: [''],
      brakeSystem: [''],
      chassisCondition: [''],
      bodyCondition: [''],
      batteryCondition: [''],
      paintWork: [''],
      clutchSystem: [''],
      gearBoxAssy: [''],
      propellerShaft: [''],
      differentialAssy: [''],
      cabin: [''],
      dashboard: [''],
      seats: [''],
      headLamps: [''],
      electricAssembly: [''],
      radiator: [''],
      intercooler: [''],
      allHosePipes: [''],
      remarks: [''],
      fuelSystem: [''],
      exteriorCondition: [''],
      interiorCondition: [''],
      steeringWheel: [''],
      steeringColumn: [''],
      steeringBox: [''],
      steeringLinkages: [''],
      bonnet: [''],
      mudguards: [''],
      allGlasses: [''],
      boom: [''],
      bucket: [''],
      chainTrack: [''],
      hydraulicCylinders: [''],
      swingUnit: [''],
      upholstery: [''],
      interiorTrims: [''],
      front: [''],
      rear: [''],
      axles: [''],
      airConditioner: [''],
      audio: [''],

      // Body & Structure
      speedoMeter: [''],
      frontAxles: [''],
      rearAxles: [''],
      driveShafts: [''],
      steeringHandle: [''],
      frontForkAssy: [''],
      frontFairing: [''],
      rearCowls: [''],
      bumpers: [''],
      doors: [''],
      fenders: [''],
      rightSideWing: [''],
      leftSideWing: [''],
      tailGate: [''],
      loadFloor: [''],

      // Brakes Additional
      parkingBrake: [''],
      abs: [''],

      // Electrical Additional
      tailLightsIndicators: [''],
      wiringAssy: [''],

      // Crash Guards
      frontCrashGuard: [''],
      rearCrashGuard: [''],

      // 4W Specific
      airBags: [''],
      sunRoof: [''],
      sideFenders: [''],

      // CV Specific
      hydraulicLift: [''],
      sideUnderRunProtection: [''],

      // 2W Specific
      mainStand: [''],
      sideStand: [''],
      frontMudGuard: [''],
      rearMudGuard: [''],
      fuelTankCondition: [''],
      chainSprocket: [''],
      frontBrakeCondition: [''],
      rearBrakeCondition: [''],
      headLight: [''],
      tailLight: [''],
      indicators: [''],
      hornCondition: [''],
      mirrorCondition: [''],
      seatCondition: [''],
      handleBarGrips: [''],
      footRest: [''],
      alloyWheelRim: [''],

      // CE Specific
      retarder: [''],
      differentialLock: [''],
      pto: [''],
      hydraulicSystem: [''],
      boomArm: [''],
      bucketCondition: [''],
      bladeCondition: [''],
      liftingCapacity: [''],
      tyreConditionCe: [''],
      underCarriage: [''],
      crawlerTracks: [''],
      steelRims: [''],
      attachmentCondition: [''],
      cabCondition: [''],
      counterWeight: [''],
      rockBreaker: [''],

      // BUS Specific
      coachCondition: [''],
      passengerSeats: [''],
      emergencyExits: [''],
      luggageCompartment: [''],
      acSystem: [''],
      destinationBoard: [''],
      sideMirrors: [''],

      // FE / Tractor Specific
      rightIndividualBrakes: [''],
      leftIndividualBrakes: [''],
      threePointLinkage: [''],
      powerTakeOff: [''],
      hitchSystem: [''],
      hydraulicLiftFe: [''],
      frontWeights: [''],
      rearWeights: [''],
      ropsCanopy: [''],
      frontTyreCondition: [''],
      rearTyreCondition: [''],
      implementAttachments: [''],
      fuelTankFe: [''],
      frontAxleFe: [''],
      rearDrawbar: [''],

      // Excel-registry aligned fields
      tyreCondition: [''],
      electricalSystem: [''],
      loadBodyAssy: [''],
      bodyAssy: [''],
      cabinAssy: [''],
      frontBrakes: [''],
      rearBrakes: [''],
      headLights: [''],
      frontSuspension: [''],
      rearSuspension: [''],
      rightSideGate: [''],
      leftSideGate: [''],
      frontScoop: [''],
      rvMirrors: [''],
      lockSet: [''],
      sideCovers: [''],
      bellyPanels: [''],
      brakeLeversFluid: [''],
      silencer: [''],
      silencerCover: [''],
      accelerator: [''],
      handleBar: [''],
      steeringStem: [''],
      frontShockAbsorber: [''],
      rearShockAbsorber: [''],
      legGuard: [''],
      sareeGuard: [''],
      chainGuard: [''],
      selfStart: [''],
      horn: [''],
      kickPedalFootRest: [''],
      frontPanel: [''],
      frontGlassFrame: [''],
      switches: [''],
      loadCarrier: [''],
      steeringControlSystem: [''],
      cabinStructure: [''],
      dashboardControls: [''],
      glassPanels: [''],
      bucketBlade: [''],
      pinsAndBushes: [''],
      serviceBrake: [''],
      emergencyStop: [''],
      sensors: [''],
      steeringControlLevers: [''],
      hydraulicSteeringPump: [''],
      swivelJoints: [''],
      hydraulicOilCooler: [''],
      hydraulicPump: [''],
      hosesAndFittings: [''],
      swingMechanism: [''],
      trackChains: [''],
      sprockets: [''],
      rollers: [''],
      hourMeter: [''],
      bonnetGuard: [''],
      torqueConverter: [''],
      finalDrive: [''],
      bodyStructure: [''],
      driverCabin: [''],
      bumpersAndGrilles: [''],
      seatsAndBerths: [''],
      sideBodyPanels: [''],
      rearBodyPanels: [''],
      operatorPlatform: [''],
      operatorStation: [''],
      canopy: [''],
      frontGrilles: [''],
      brakeEqualization: [''],
      fanAssy: [''],
      rearAxleFe: [''],
      tieRodsJoints: [''],
      muffler: [''],
      airFilter: [''],
      dropArm: [''],
      attachmentHitch: ['']
    });
  }

  private loadInspection() {
    this.loading = true;
    this.error = null;
    this.inspectionSvc.getInspectionDetails(this.valuationId, this.vehicleNumber, this.applicantContact).subscribe({
      next: data => {
        console.log('✅ Inspection Data Loaded:', data);
        this.inspection = data;
        this.patchForm(data);
        
        // [ADDED FOR PDF READ-ONLY VIEW] Disable the entire form if viewOnly=true
        if (this.isViewOnly) {
           this.form.disable();
        }

        // STORE ORIGINAL DATA
        this.originalFormData = JSON.parse(JSON.stringify(this.form.getRawValue()));
        this.loading = false;
        // Mandatory photos are checked in onSave / onSubmit — warning about them on
        // load blocked the form before the inspector had done anything.
      },
      error: err => {
        console.error('❌ Error Loading Inspection:', err);
        this.error = err.message || 'Failed to load inspection details.';
        this.loading = false;
      }
    });
  }

  private patchForm(data: Inspection | any) {
    // FormData serializes booleans as "true"/"false" strings — convert back to boolean for mat-select
    const toBool = (v: any): boolean | null =>
      v === true || v === 'true' ? true : v === false || v === 'false' ? false : null;

    // Normalize string dropdown values to UPPERCASE to match CONDITION_OPTIONS / YES_NO_OPTIONS
    const nc = (v: any): string => typeof v === 'string' && v ? v.trim().toUpperCase() : '';

    const v = this.form;
    v.patchValue({
      vehicleInspectedBy: data.vehicleInspectedBy || '',
      dateOfInspection: this.toLocalDateOnly(data.dateOfInspection),
      inspectionLocation: data.inspectionLocation || '',
      vehicleMoved: toBool(data.vehicleMoved) ?? false,
      engineStarted: toBool(data.engineStarted) ?? false,
      odometer: data.odometer || 0,
      vinPlate: toBool(data.vinPlate) ?? false,
      bodyType: data.bodyType || '',
      overallTyreCondition: nc(data.overallTyreCondition),
      otherAccessoryFitment: toBool(data.otherAccessoryFitment) ?? false,
      windshieldGlass: data.windshieldGlass || '',
      roadWorthyCondition: toBool(data.roadWorthyCondition) ?? false,
      engineCondition: nc(data.engineCondition),
      suspensionSystem: nc(data.suspensionSystem),
      steeringSystem: nc(data.steeringSystem || (data as any).steeringAssy),
      brakeSystem: nc(data.brakeSystem),
      chassisCondition: nc(data.chassisCondition),
      bodyCondition: nc(data.bodyCondition),
      batteryCondition: nc(data.batteryCondition),
      paintWork: nc(data.paintWork),
      clutchSystem: nc(data.clutchSystem),
      gearBoxAssy: nc(data.gearBoxAssy),
      propellerShaft: nc(data.propellerShaft),
      differentialAssy: nc(data.differentialAssy),
      cabin: nc(data.cabin),
      dashboard: nc(data.dashboard),
      seats: nc(data.seats),
      headLamps: nc(data.headLamps),
      electricAssembly: nc(data.electricAssembly),
      radiator: nc(data.radiator),
      intercooler: nc(data.intercooler),
      allHosePipes: nc(data.allHosePipes),
      remarks: data.remarks || '',
      fuelSystem: nc(data.fuelSystem),
      exteriorCondition: nc(data.exteriorCondition),
      interiorCondition: nc(data.interiorCondition),
      steeringWheel: nc(data.steeringWheel),
      steeringColumn: nc(data.steeringColumn),
      steeringBox: nc(data.steeringBox),
      steeringLinkages: nc(data.steeringLinkages),
      bonnet: nc(data.bonnet),
      mudguards: nc(data.mudguards),
      allGlasses: nc(data.allGlasses),
      boom: nc(data.boom),
      bucket: nc(data.bucket),
      chainTrack: nc(data.chainTrack),
      hydraulicCylinders: nc(data.hydraulicCylinders),
      swingUnit: nc(data.swingUnit),
      upholstery: nc((data as any).upholstery || (data as any).upholestry),
      interiorTrims: nc(data.interiorTrims),
      front: nc(data.front),
      rear: nc(data.rear),
      axles: nc(data.axles),
      airConditioner: nc(data.airConditioner),
      audio: nc(data.audio),

      // Body & Structure
      speedoMeter: nc(data.speedoMeter),
      frontAxles: nc(data.frontAxles),
      rearAxles: nc(data.rearAxles),
      driveShafts: nc(data.driveShafts),
      steeringHandle: nc(data.steeringHandle),
      frontForkAssy: nc(data.frontForkAssy),
      frontFairing: nc(data.frontFairing),
      rearCowls: nc(data.rearCowls),
      bumpers: nc(data.bumpers),
      doors: nc(data.doors),
      fenders: nc(data.fenders),
      rightSideWing: nc(data.rightSideWing),
      leftSideWing: nc(data.leftSideWing),
      tailGate: nc(data.tailGate),
      loadFloor: nc(data.loadFloor),
      // Brakes Additional
      parkingBrake: nc(data.parkingBrake),
      abs: nc(data.abs),
      // Electrical Additional
      tailLightsIndicators: nc(data.tailLightsIndicators),
      wiringAssy: nc(data.wiringAssy),
      // Crash Guards
      frontCrashGuard: nc(data.frontCrashGuard),
      rearCrashGuard: nc(data.rearCrashGuard),
      // 4W Specific
      airBags: nc(data.airBags),
      sunRoof: nc(data.sunRoof),
      sideFenders: nc(data.sideFenders),
      // CV Specific
      hydraulicLift: nc(data.hydraulicLift),
      sideUnderRunProtection: nc(data.sideUnderRunProtection),
      // 2W Specific
      mainStand: nc(data.mainStand),
      sideStand: nc(data.sideStand),
      frontMudGuard: nc(data.frontMudGuard),
      rearMudGuard: nc(data.rearMudGuard),
      fuelTankCondition: nc(data.fuelTankCondition),
      chainSprocket: nc(data.chainSprocket),
      frontBrakeCondition: nc(data.frontBrakeCondition),
      rearBrakeCondition: nc(data.rearBrakeCondition),
      headLight: nc(data.headLight),
      tailLight: nc(data.tailLight),
      indicators: nc(data.indicators),
      hornCondition: nc(data.hornCondition),
      mirrorCondition: nc(data.mirrorCondition),
      seatCondition: nc(data.seatCondition),
      handleBarGrips: nc(data.handleBarGrips),
      footRest: nc(data.footRest),
      alloyWheelRim: nc(data.alloyWheelRim),
      // CE Specific
      retarder: nc(data.retarder),
      differentialLock: nc(data.differentialLock),
      pto: nc(data.pto),
      hydraulicSystem: nc(data.hydraulicSystem),
      boomArm: nc(data.boomArm),
      bucketCondition: nc(data.bucketCondition),
      bladeCondition: nc(data.bladeCondition),
      liftingCapacity: nc(data.liftingCapacity),
      tyreConditionCe: nc(data.tyreConditionCe),
      underCarriage: nc(data.underCarriage),
      crawlerTracks: nc(data.crawlerTracks),
      steelRims: nc(data.steelRims),
      attachmentCondition: nc(data.attachmentCondition),
      cabCondition: nc(data.cabCondition),
      counterWeight: nc(data.counterWeight),
      rockBreaker: nc(data.rockBreaker),
      // BUS Specific
      coachCondition: nc(data.coachCondition),
      passengerSeats: nc(data.passengerSeats),
      emergencyExits: nc(data.emergencyExits),
      luggageCompartment: nc(data.luggageCompartment),
      acSystem: nc(data.acSystem),
      destinationBoard: nc(data.destinationBoard),
      sideMirrors: nc(data.sideMirrors),
      // FE / Tractor Specific
      rightIndividualBrakes: nc(data.rightIndividualBrakes),
      leftIndividualBrakes: nc(data.leftIndividualBrakes),
      threePointLinkage: nc(data.threePointLinkage),
      powerTakeOff: nc(data.powerTakeOff),
      hitchSystem: nc(data.hitchSystem),
      hydraulicLiftFe: nc(data.hydraulicLiftFe),
      frontWeights: nc(data.frontWeights),
      rearWeights: nc(data.rearWeights),
      ropsCanopy: nc(data.ropsCanopy),
      frontTyreCondition: nc(data.frontTyreCondition),
      rearTyreCondition: nc(data.rearTyreCondition),
      implementAttachments: nc(data.implementAttachments),
      fuelTankFe: nc(data.fuelTankFe),
      frontAxleFe: nc(data.frontAxleFe),
      rearDrawbar: nc(data.rearDrawbar),

      // Excel-registry aligned fields
      tyreCondition: nc((data as any).tyreCondition),
      electricalSystem: nc((data as any).electricalSystem),
      loadBodyAssy: nc((data as any).loadBodyAssy),
      bodyAssy: nc((data as any).bodyAssy),
      cabinAssy: nc((data as any).cabinAssy),
      frontBrakes: nc((data as any).frontBrakes),
      rearBrakes: nc((data as any).rearBrakes),
      headLights: nc((data as any).headLights),
      frontSuspension: nc((data as any).frontSuspension),
      rearSuspension: nc((data as any).rearSuspension),
      rightSideGate: nc((data as any).rightSideGate),
      leftSideGate: nc((data as any).leftSideGate),
      frontScoop: nc((data as any).frontScoop),
      rvMirrors: nc((data as any).rvMirrors),
      lockSet: nc((data as any).lockSet),
      sideCovers: nc((data as any).sideCovers),
      bellyPanels: nc((data as any).bellyPanels),
      brakeLeversFluid: nc((data as any).brakeLeversFluid),
      silencer: nc((data as any).silencer),
      silencerCover: nc((data as any).silencerCover),
      accelerator: nc((data as any).accelerator),
      handleBar: nc((data as any).handleBar),
      steeringStem: nc((data as any).steeringStem),
      frontShockAbsorber: nc((data as any).frontShockAbsorber),
      rearShockAbsorber: nc((data as any).rearShockAbsorber),
      legGuard: nc((data as any).legGuard),
      sareeGuard: nc((data as any).sareeGuard),
      chainGuard: nc((data as any).chainGuard),
      selfStart: nc((data as any).selfStart),
      horn: nc((data as any).horn),
      kickPedalFootRest: nc((data as any).kickPedalFootRest),
      frontPanel: nc((data as any).frontPanel),
      frontGlassFrame: nc((data as any).frontGlassFrame),
      switches: nc((data as any).switches),
      loadCarrier: nc((data as any).loadCarrier),
      steeringControlSystem: nc((data as any).steeringControlSystem),
      cabinStructure: nc((data as any).cabinStructure),
      dashboardControls: nc((data as any).dashboardControls),
      glassPanels: nc((data as any).glassPanels),
      bucketBlade: nc((data as any).bucketBlade),
      pinsAndBushes: nc((data as any).pinsAndBushes),
      serviceBrake: nc((data as any).serviceBrake),
      emergencyStop: nc((data as any).emergencyStop),
      sensors: nc((data as any).sensors),
      steeringControlLevers: nc((data as any).steeringControlLevers),
      hydraulicSteeringPump: nc((data as any).hydraulicSteeringPump),
      swivelJoints: nc((data as any).swivelJoints),
      hydraulicOilCooler: nc((data as any).hydraulicOilCooler),
      hydraulicPump: nc((data as any).hydraulicPump),
      hosesAndFittings: nc((data as any).hosesAndFittings),
      swingMechanism: nc((data as any).swingMechanism),
      trackChains: nc((data as any).trackChains),
      sprockets: nc((data as any).sprockets),
      rollers: nc((data as any).rollers),
      hourMeter: nc((data as any).hourMeter),
      bonnetGuard: nc((data as any).bonnetGuard),
      torqueConverter: nc((data as any).torqueConverter),
      finalDrive: nc((data as any).finalDrive),
      bodyStructure: nc((data as any).bodyStructure),
      driverCabin: nc((data as any).driverCabin),
      bumpersAndGrilles: nc((data as any).bumpersAndGrilles),
      seatsAndBerths: nc((data as any).seatsAndBerths),
      sideBodyPanels: nc((data as any).sideBodyPanels),
      rearBodyPanels: nc((data as any).rearBodyPanels),
      operatorPlatform: nc((data as any).operatorPlatform),
      operatorStation: nc((data as any).operatorStation),
      canopy: nc((data as any).canopy),
      frontGrilles: nc((data as any).frontGrilles),
      brakeEqualization: nc((data as any).brakeEqualization),
      fanAssy: nc((data as any).fanAssy),
      rearAxleFe: nc((data as any).rearAxleFe),
      tieRodsJoints: nc((data as any).tieRodsJoints),
      muffler: nc((data as any).muffler),
      airFilter: nc((data as any).airFilter),
      dropArm: nc((data as any).dropArm),
      attachmentHitch: nc((data as any).attachmentHitch)
    });
  }

  pastOrTodayValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const input = new Date(control.value);
      const today = new Date(this.maxDate);
      input.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      return input <= today ? null : { futureDate: true };
    };
  }

  onPhotoChange(event: Event) {
    // [ADDED FOR PDF READ-ONLY VIEW] Block photo changes if view only
    if (this.isViewOnly) return;

    const input = event.target as HTMLInputElement;
    this.photoFiles = input.files ? Array.from(input.files) : [];
  }

  // Track Changed Fields
  private getChangedFields(): any[] {
    const currentData = this.form.getRawValue();
    const changedFields: any[] = [];

    Object.keys(currentData).forEach(key => {
      if (this.originalFormData[key] !== currentData[key]) {
        changedFields.push({
          fieldName: key,
          oldValue: this.originalFormData[key],
          newValue: currentData[key]
        });
      }
    });

    return changedFields;
  }

  // ✅ UPDATED: Format Date Value for proper serialization
  private formatDateValue(key: string, value: any): any {
    // Handle Inspection Date (YYYY-MM-DD)
    if (key === 'dateOfInspection' && value) {
      const d = value instanceof Date ? value : new Date(value);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
      return typeof value === 'string' ? value.slice(0, 10) : value;
    }
    return value;
  }

  private buildFormData(): FormData {
    const fd = new FormData();
    const v = this.form.getRawValue();
    
    Object.keys(v).forEach(k => {
      const value = this.formatDateValue(k, v[k]);
      // Append only if value is not null/undefined to avoid sending "null" strings
      if (value !== null && value !== undefined) {
         fd.append(k, value);
      }
    });
    
    this.photoFiles.forEach(file => fd.append('photos', file, file.name));
    fd.append('valuationId', this.valuationId);
    fd.append('vehicleNumber', this.vehicleNumber);
    fd.append('applicantContact', this.applicantContact);
    fd.append('AssignedTo', this.assignedTo);
    fd.append('AssignedToPhoneNumber', this.assignedToPhoneNumber);
    fd.append('AssignedToEmail', this.assignedToEmail);
    fd.append('AssignedToWhatsapp', this.assignedToWhatsapp);
    return fd;
  }

  /**
   * Opens the photo upload screen. Reachable at any time — Save refuses to run
   * until the mandatory photos exist, so gating this on a successful save left a
   * fresh inspection with no way to get here at all.
   *
   * Navigating away drops unsaved form edits, so warn first when there are any.
   */
  onClick() {
    if (!this.isViewOnly && this.form.dirty && !this.saved) {
      const proceed = confirm(
        'You have unsaved changes on this form.\n\n' +
        'Opening the photo screen will discard them. Continue?'
      );
      if (!proceed) return;
    }
    this.goBackToPhotoUpload();
  }

  /**
   * Dropdowns in the fixed General Condition block, mapped to the visibilityMap key
   * that governs them and the value to prefill. Free-text and numeric controls
   * (Vehicle Inspected By, Inspection Location, Body Type, Odometer, Remarks) are
   * deliberately absent — the inspector fills those in by hand.
   */
  private static readonly STATIC_DEFAULTS: { control: string; visibility: string; value: any }[] = [
    { control: 'vehicleMoved',          visibility: 'vehicleMoved',          value: true   },
    { control: 'engineStarted',         visibility: 'engineStarted',         value: true   },
    { control: 'vinPlate',              visibility: 'vinPlate',              value: true   },
    { control: 'otherAccessoryFitment', visibility: 'otherAccessoryFitment', value: false  },
    { control: 'roadWorthyCondition',   visibility: 'roadWorthyCondition',   value: true   },
    { control: 'overallTyreCondition',  visibility: 'tyreCondition',         value: 'GOOD' },
  ];

  public updateDefaultValues(): void {
    if (this.isViewOnly || !this.valuationType) { return; }
    const defaults: Record<string, any> = {};

    const isBlank = (v: any) => v === '' || v == null;

    for (const d of InspectionUpdateComponent.STATIC_DEFAULTS) {
      if (!this.showField(d.visibility)) { continue; }
      if (isBlank(this.form.get(d.control)?.value)) {
        defaults[d.control] = d.value;
      }
    }

    // Registry fields — use each field's declared default
    for (const section of this.registrySections) {
      for (const field of section.fields) {
        const control = this.form.get(field.key);
        if (control && isBlank(control.value)) {
          defaults[field.key] = field.default ?? (field.type === 'condition' ? 'GOOD' : 'YES');
        }
      }
    }

    this.form.patchValue(defaults);
  }

  checkMandatoryPhotosBeforeSave(): Promise<boolean> {
    return new Promise((resolve) => {
      this.vehicleInspectionService.checkMandatoryPhotos(this.valuationId, this.vehicleNumber, this.applicantContact).subscribe({
        next: (response) => {
          if (!response.isComplete) {
            this.missingPhotos = response.missingPhotos;
            this.mandatoryPhotosError = `${response.missingPhotos.length} mandatory images are missing:\n` + response.missingPhotos.map(p => `• ${p}`).join('\n');
            resolve(false);
          } else {
            this.mandatoryPhotosError = null;
            this.missingPhotos = [];
            resolve(true);
          }
        },
        error: (err) => {
          console.error('Error checking photos:', err);
          this.mandatoryPhotosError = 'Error validating photos. Please try again.';
          resolve(false);
        }
      });
    });
  }

  showMissingPhotosDialog(): void {
    const missingList = this.missingPhotos.map(p => `• ${p}`).join('\n');
    // The details are already saved by the time this runs, so say so — the old
    // wording ("Cannot save inspection!") is what made people retype everything.
    const message =
      `✅ Inspection details saved.\n\n` +
      `⚠️ ${this.missingPhotos.length} mandatory images are still missing:\n\n${missingList}\n\n` +
      `Upload them to move this case forward. Your entered details are safe.`;
    alert(message);
  }

  goBackToPhotoUpload(): void {
    this.router.navigate(['/valuation', this.valuationId, 'inspection', 'vehicle-image-upload'], {
      // [ADDED FOR PDF READ-ONLY VIEW] Pass viewOnly back
      queryParams: { vehicleNumber: this.vehicleNumber, applicantContact: this.applicantContact, valuationType: this.valuationType, viewOnly: this.isViewOnly }
    });
  }

  // History Logger
  private logHistoryAction(
    action: string,
    remarks: string,
    statusFrom: string | null,
    statusTo: string | null
  ): Observable<any> {
    return new Observable(observer => {
      this.historyLogger.logAction(
        this.valuationId,
        action,
        remarks,
        this.currentUserId,
        this.currentUserName,
        statusFrom,
        statusTo
      ).then(() => {
        console.log('✅ History logged:', action);
        observer.next(true);
        observer.complete();
      }).catch((err: any) => {
        console.error('❌ Error logging history:', err);
        observer.next(true); // Don't fail if logging fails
        observer.complete();
      });
    });
  }

  async onSave() {
    if (this.isViewOnly) return; // Prevent action if read only

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.error = null;
    this.saving = true;
    this.saveInProgress = true;
    const payload = this.buildFormData();
    const changedFields = this.getChangedFields();
    const changedFieldsStr = changedFields.map(f => f.fieldName).join(', ');

    // Persist the typed details BEFORE checking photos. The old order checked
    // photos first and returned without saving, so opening the upload screen threw
    // away everything the inspector had entered and they had to type it all again.
    // Missing photos should block the case moving on, not cost someone their work.
    try {
      await firstValueFrom(
        this.inspectionSvc.updateInspectionDetails(
          this.valuationId, this.vehicleNumber, this.applicantContact, payload));
    } catch {
      this.saving = false;
      this.saveInProgress = false;
      this.error = 'Failed to save inspection details.';
      this.cdr.detectChanges();
      return;
    }

    // Safe to leave the page now — the "unsaved changes" prompt would be a lie.
    this.form.markAsPristine();
    this.saved = true;

    const photosValid = await this.checkMandatoryPhotosBeforeSave();
    if (!photosValid) {
      this.saving = false;
      this.saveInProgress = false;
      this.showMissingPhotosDialog();
      this.cdr.detectChanges();
      return;
    }

    // Photos are complete: advance the workflow and log it.
    of(null)
      .pipe(
        switchMap(() => this.workflowSvc.updateWorkflowTable(this.valuationId, this.vehicleNumber, this.applicantContact, {
          workflow: 'AVO',
          workflowStepOrder: 3,
          assignedTo: this.assignedTo,
          assignedToPhoneNumber: this.assignedToPhoneNumber,
          assignedToEmail: this.assignedToEmail,
          assignedToWhatsapp: this.assignedToWhatsapp,
          avoAssignedTo: this.assignedTo,
          avoAssignedToPhoneNumber: this.assignedToPhoneNumber,
          avoAssignedToEmail: this.assignedToEmail,
          avoAssignedToWhatsapp: this.assignedToWhatsapp
        })),
        // LOG HISTORY
        switchMap(() =>
          this.logHistoryAction(
            'Inspection Details Saved - AVO',
            `${changedFields.length} field(s) updated: ${changedFieldsStr}`,
            null,
            'AVO'
          )
        )
      )
      .subscribe({
        next: () => {
          this.saveInProgress = false;
          this.saving = false;
          this.saved = true;
          this._snackBar.open('✅ Inspection saved successfully and history logged', 'Close', { duration: 3000, horizontalPosition: 'center', verticalPosition: 'top' });
          this.originalFormData = JSON.parse(JSON.stringify(this.form.getRawValue()));
        },
        error: (err) => {
          this.error = err.message || 'Save failed.';
          this.saveInProgress = false;
          this.saving = false;
        }
      });
  }

  async onSubmit() {
    if (this.isViewOnly) return; // Prevent action if read only

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const photosValid = await this.checkMandatoryPhotosBeforeSave();
    if (!photosValid) {
      this.showMissingPhotosDialog();
      return;
    }

    this.saving = true;
    this.submitInProgress = true;
    const payload = this.buildFormData();
    const changedFields = this.getChangedFields();
    const changedFieldsStr = changedFields.map(f => f.fieldName).join(', ');

    this.inspectionSvc.updateInspectionDetails(this.valuationId, this.vehicleNumber, this.applicantContact, payload)
      .pipe(
        switchMap(() => this.workflowSvc.startWorkflow(this.valuationId, 3, this.vehicleNumber, encodeURIComponent(this.applicantContact)).pipe(catchError(() => of(null)))),
        switchMap(() => this.workflowSvc.completeWorkflow(this.valuationId, 3, this.vehicleNumber, encodeURIComponent(this.applicantContact)).pipe(catchError(() => of(null)))),
        switchMap(() => this.workflowSvc.startWorkflow(this.valuationId, 4, this.vehicleNumber, encodeURIComponent(this.applicantContact))),
        // AI market-value estimate is best-effort — never block the submit if it fails
        switchMap(() => this.qualityControlSvc.getValuationDetailsfromAI(this.valuationId, this.vehicleNumber, this.applicantContact).pipe(catchError(() => of(null)))),
        switchMap(() => this.workflowSvc.updateWorkflowTable(this.valuationId, this.vehicleNumber, this.applicantContact, {
          workflow: 'QC',
          workflowStepOrder: 4,
          avoAssignedTo: this.assignedTo,
          avoAssignedToPhoneNumber: this.assignedToPhoneNumber,
          avoAssignedToEmail: this.assignedToEmail,
          avoAssignedToWhatsapp: this.assignedToWhatsapp
        })),
        // LOG HISTORY
        switchMap(() =>
          this.logHistoryAction(
            'Inspection Submitted - Moving to QC',
            `Inspection completed. ${changedFields.length} field(s) updated: ${changedFieldsStr}. Status: AVO Complete → QC In Progress`,
            'AVO',
            'QC'
          )
        )
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/valuation', this.valuationId, 'inspection'], {
            queryParams: { vehicleNumber: this.vehicleNumber, applicantContact: this.applicantContact, valuationType: this.valuationType }
          });
        },
        error: (err) => {
          this.error = err.message || 'Submit failed.';
          this.submitInProgress = false;
          this.saving = false;
        }
      });
  }

  onCancel() {
    this.router.navigate(['/valuation', this.valuationId, 'inspection'], {
      queryParams: { vehicleNumber: this.vehicleNumber, applicantContact: this.applicantContact, valuationType: this.valuationType }
    });
  }
}
// src/app/valuation-inspection-update/inspection-update.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { switchMap, take } from 'rxjs/operators';
import { Observable, Subscription } from 'rxjs';
import { RouterModule } from '@angular/router';
import { Auth, User, authState } from '@angular/fire/auth';

// Services
import { InspectionService } from '../../../services/inspection.service';
import { VehicleInspectionService } from '../../../services/vehicle-inspection.service';
import { WorkflowService } from '../../../services/workflow.service';
import { QualityControlService } from '../../../services/quality-control.service';
import { HistoryLoggerService } from '../../../services/history-logger.service';

// Models
import { Inspection } from '../../../models/Inspection';

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
      'vehicleInspectedBy','inspectionDate','inspectionLocation','frontPhoto','odometer','engineCondition',
      'chassisCondition','steeringSystem','brakeSystem','suspensionSystem','fuelSystem',
      'tyreCondition','bodyCondition','cabinCondition','exteriorCondition','interiorCondition',
      'gearboxAssembly','clutchSystem','driveShafts','propellerShaft','differentialAssy',
      'radiator','interCooler','allHosePipes','paintWork','vinPlate','vehicleMoved','engineStarted','roadWorthyCondition','otherAccessoryFitment',
      'parkingBrake','abs','tailLightsIndicators','wiringAssy','frontCrashGuard','rearCrashGuard',
      'airBags','sunRoof','sideFenders','headLamps','batteryCondition'
    ],
    'cv': [
      'vehicleInspectedBy','inspectionDate','inspectionLocation','frontPhoto','odometer','engineCondition',
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
      'vehicleInspectedBy','inspectionDate','inspectionLocation','frontPhoto','odometer','engineCondition',
      'chassisCondition','steeringSystem','brakeSystem','electricAssembly','suspensionSystem',
      'fuelSystem','tyreCondition','bodyCondition','exteriorCondition','gearboxAssembly',
      'clutchSystem','steeringHandle','frontForkAssy','mudguards','frontFairing','rearCowls',
      'seats','speedoMeter','front','rear','paintWork','vinPlate','vehicleMoved','engineStarted','roadWorthyCondition','otherAccessoryFitment',
      'mainStand','sideStand','frontMudGuard','rearMudGuard','fuelTankCondition','chainSprocket',
      'frontBrakeCondition','rearBrakeCondition','headLight','tailLight','indicators',
      'hornCondition','mirrorCondition','seatCondition','handleBarGrips','footRest','alloyWheelRim'
    ],
    'three-wheeler': [
      'vehicleInspectedBy','inspectionDate','inspectionLocation','frontPhoto','odometer','engineCondition',
      'chassisCondition','steeringSystem','brakeSystem','electricAssembly','suspensionSystem',
      'fuelSystem','tyreCondition','bodyCondition','cabinCondition','exteriorCondition',
      'interiorCondition','gearboxAssembly','clutchSystem','driveShafts','radiator','interCooler',
      'allHosePipes','steeringColumn','steeringBox','steeringLinkages','steeringHandle',
      'frontForkAssy','mudguards','allGlasses','dashboard','seats','upholstery','interiorTrims',
      'front','rear','axles','airConditioner','audio','paintWork','vinPlate','vehicleMoved','engineStarted','roadWorthyCondition','otherAccessoryFitment',
      'parkingBrake','abs','tailLightsIndicators','wiringAssy','frontCrashGuard','rearCrashGuard'
    ],
    'tractor': [
      'vehicleInspectedBy','inspectionDate','inspectionLocation','frontPhoto','odometer','engineCondition',
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
      'vehicleInspectedBy','inspectionDate','inspectionLocation','frontPhoto','odometer','engineCondition',
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
      'vehicleInspectedBy','inspectionDate','inspectionLocation','frontPhoto','odometer','engineCondition',
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
    private historyLogger: HistoryLoggerService
  ) {}

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
    return !!(this.valuationType && this.visibilityMap[this.valuationType]?.includes(key));
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

  private toIsoUtc(datetimeLocal: string): string {
    if (!datetimeLocal) return new Date().toISOString();
    const date = new Date(datetimeLocal);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString();
  }

  // ✅ UPDATED: Init Form with Payment Fields
  private initForm() {
    const nowLocal = this.toLocalDateTimeInput(new Date());

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
      allGlasses: [false],
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

      // ✅ ADDED PAYMENT FIELDS
      paymentStatus: ['Pending', Validators.required],
      paymentReference: [''],
      paymentDate: [nowLocal, Validators.required],
      paymentMethod: ['Online', Validators.required],
      paymentAmount: [800, [Validators.required, Validators.min(0)]]
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
        
        // Skip mandatory photo check if read-only, we aren't saving anyway
        if (!this.isViewOnly) {
            this.checkMandatoryPhotosBeforeSave().then(isComplete => {
            console.log('📸 Photo Validation Result:', {
                isComplete: isComplete,
                missingPhotos: this.missingPhotos,
                errorMessage: this.mandatoryPhotosError
            });
            });
        }
      },
      error: err => {
        console.error('❌ Error Loading Inspection:', err);
        this.error = err.message || 'Failed to load inspection details.';
        this.loading = false;
      }
    });
  }

  // ✅ UPDATED: Patch Form with Payment Data
  private patchForm(data: Inspection | any) {
    // Handle payment date
    const existingPaymentDate = data.paymentDate
      ? this.toLocalDateTimeInput(new Date(data.paymentDate))
      : this.toLocalDateTimeInput(new Date());

    // FormData serializes booleans as "true"/"false" strings — convert back to boolean for mat-select
    const toBool = (v: any): boolean | null =>
      v === true || v === 'true' ? true : v === false || v === 'false' ? false : null;

    const v = this.form;
    v.patchValue({
      vehicleInspectedBy: data.vehicleInspectedBy || '',
      dateOfInspection: data.dateOfInspection?.slice(0, 10) || '',
      inspectionLocation: data.inspectionLocation || '',
      vehicleMoved: toBool(data.vehicleMoved) ?? false,
      engineStarted: toBool(data.engineStarted) ?? false,
      odometer: data.odometer || 0,
      vinPlate: toBool(data.vinPlate) ?? false,
      bodyType: data.bodyType || '',
      overallTyreCondition: toBool(data.overallTyreCondition),
      otherAccessoryFitment: toBool(data.otherAccessoryFitment) ?? false,
      windshieldGlass: data.windshieldGlass || '',
      roadWorthyCondition: toBool(data.roadWorthyCondition) ?? false,
      engineCondition: toBool(data.engineCondition),
      suspensionSystem: toBool(data.suspensionSystem),
      steeringSystem: toBool(data.steeringSystem ?? (data as any).steeringAssy),
      brakeSystem: toBool(data.brakeSystem),
      chassisCondition: toBool(data.chassisCondition),
      bodyCondition: data.bodyCondition || '',
      batteryCondition: data.batteryCondition || '',
      paintWork: toBool(data.paintWork),
      clutchSystem: toBool(data.clutchSystem),
      gearBoxAssy: toBool(data.gearBoxAssy),
      propellerShaft: toBool(data.propellerShaft),
      differentialAssy: toBool(data.differentialAssy),
      cabin: data.cabin || '',
      dashboard: data.dashboard || '',
      seats: data.seats || '',
      headLamps: data.headLamps || '',
      electricAssembly: data.electricAssembly || '',
      radiator: data.radiator || '',
      intercooler: data.intercooler || '',
      allHosePipes: data.allHosePipes || '',
      remarks: data.remarks || '',
      fuelSystem: data.fuelSystem || '',
      exteriorCondition: data.exteriorCondition || '',
      interiorCondition: data.interiorCondition || '',
      steeringWheel: data.steeringWheel || '',
      steeringColumn: data.steeringColumn || '',
      steeringBox: data.steeringBox || '',
      steeringLinkages: data.steeringLinkages || '',
      bonnet: data.bonnet || '',
      mudguards: data.mudguards || '',
      allGlasses: data.allGlasses || false,
      boom: data.boom || '',
      bucket: data.bucket || '',
      chainTrack: data.chainTrack || '',
      hydraulicCylinders: data.hydraulicCylinders || '',
      swingUnit: data.swingUnit || '',
      upholstery: (data as any).upholstery || (data as any).upholestry || '',
      interiorTrims: data.interiorTrims || '',
      front: data.front || '',
      rear: data.rear || '',
      axles: data.axles || '',
      airConditioner: data.airConditioner || '',
      audio: data.audio || '',

      // Body & Structure
      speedoMeter: data.speedoMeter || '',
      frontAxles: data.frontAxles || '',
      rearAxles: data.rearAxles || '',
      driveShafts: data.driveShafts || '',
      steeringHandle: data.steeringHandle || '',
      frontForkAssy: data.frontForkAssy || '',
      frontFairing: data.frontFairing || '',
      rearCowls: data.rearCowls || '',
      bumpers: data.bumpers || '',
      doors: data.doors || '',
      fenders: data.fenders || '',
      rightSideWing: data.rightSideWing || '',
      leftSideWing: data.leftSideWing || '',
      tailGate: data.tailGate || '',
      loadFloor: data.loadFloor || '',
      // Brakes Additional
      parkingBrake: data.parkingBrake || '',
      abs: data.abs || '',
      // Electrical Additional
      tailLightsIndicators: data.tailLightsIndicators || '',
      wiringAssy: data.wiringAssy || '',
      // Crash Guards
      frontCrashGuard: data.frontCrashGuard || '',
      rearCrashGuard: data.rearCrashGuard || '',
      // 4W Specific
      airBags: data.airBags || '',
      sunRoof: data.sunRoof || '',
      sideFenders: data.sideFenders || '',
      // CV Specific
      hydraulicLift: data.hydraulicLift || '',
      sideUnderRunProtection: data.sideUnderRunProtection || '',
      // 2W Specific
      mainStand: data.mainStand || '',
      sideStand: data.sideStand || '',
      frontMudGuard: data.frontMudGuard || '',
      rearMudGuard: data.rearMudGuard || '',
      fuelTankCondition: data.fuelTankCondition || '',
      chainSprocket: data.chainSprocket || '',
      frontBrakeCondition: data.frontBrakeCondition || '',
      rearBrakeCondition: data.rearBrakeCondition || '',
      headLight: data.headLight || '',
      tailLight: data.tailLight || '',
      indicators: data.indicators || '',
      hornCondition: data.hornCondition || '',
      mirrorCondition: data.mirrorCondition || '',
      seatCondition: data.seatCondition || '',
      handleBarGrips: data.handleBarGrips || '',
      footRest: data.footRest || '',
      alloyWheelRim: data.alloyWheelRim || '',
      // CE Specific
      retarder: data.retarder || '',
      differentialLock: data.differentialLock || '',
      pto: data.pto || '',
      hydraulicSystem: data.hydraulicSystem || '',
      boomArm: data.boomArm || '',
      bucketCondition: data.bucketCondition || '',
      bladeCondition: data.bladeCondition || '',
      liftingCapacity: data.liftingCapacity || '',
      tyreConditionCe: data.tyreConditionCe || '',
      underCarriage: data.underCarriage || '',
      crawlerTracks: data.crawlerTracks || '',
      steelRims: data.steelRims || '',
      attachmentCondition: data.attachmentCondition || '',
      cabCondition: data.cabCondition || '',
      counterWeight: data.counterWeight || '',
      rockBreaker: data.rockBreaker || '',
      // BUS Specific
      coachCondition: data.coachCondition || '',
      passengerSeats: data.passengerSeats || '',
      emergencyExits: data.emergencyExits || '',
      luggageCompartment: data.luggageCompartment || '',
      acSystem: data.acSystem || '',
      destinationBoard: data.destinationBoard || '',
      sideMirrors: data.sideMirrors || '',
      // FE / Tractor Specific
      rightIndividualBrakes: data.rightIndividualBrakes || '',
      leftIndividualBrakes: data.leftIndividualBrakes || '',
      threePointLinkage: data.threePointLinkage || '',
      powerTakeOff: data.powerTakeOff || '',
      hitchSystem: data.hitchSystem || '',
      hydraulicLiftFe: data.hydraulicLiftFe || '',
      frontWeights: data.frontWeights || '',
      rearWeights: data.rearWeights || '',
      ropsCanopy: data.ropsCanopy || '',
      frontTyreCondition: data.frontTyreCondition || '',
      rearTyreCondition: data.rearTyreCondition || '',
      implementAttachments: data.implementAttachments || '',
      fuelTankFe: data.fuelTankFe || '',
      frontAxleFe: data.frontAxleFe || '',
      rearDrawbar: data.rearDrawbar || '',

      // Payment Data
      paymentStatus: data.paymentStatus || 'Pending',
      paymentReference: data.paymentReference || '',
      paymentDate: existingPaymentDate,
      paymentMethod: data.paymentMethod || 'Online',
      paymentAmount: data.paymentAmount || 800
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
    // Handle Payment Date (ISO String)
    if (key === 'paymentDate' && value) {
      return this.toIsoUtc(value);
    }
    return value;
  }

  // ✅ UPDATED: Build FormData to include payment fields properly
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

  onClick() {
    this.router.navigate(['/valuation', this.valuationId, 'inspection', 'vehicle-image-upload'], {
      // [ADDED FOR PDF READ-ONLY VIEW] pass viewOnly forward to the image upload screen
      queryParams: { vehicleNumber: this.vehicleNumber, applicantContact: this.applicantContact, valuationType: this.valuationType, viewOnly: this.isViewOnly }
    });
  }

  public updateDefaultValues(): void {
    // [ADDED FOR PDF READ-ONLY VIEW] Prevent default updates
    if (this.isViewOnly || !this.valuationType) { return; }
    const defaults: Record<string, any> = {};
    Object.keys(this.form.controls).forEach(key => {
      if (!this.showField(key)) { return; }
      const control = this.form.get(key)!;
      if (control.value === '' || control.value == null) {
        if (control instanceof FormControl || typeof control.value === 'string') {
          defaults[key] = 'Good';
        }
      } else if (typeof control.value === 'boolean') {
        defaults[key] = true;
      }
    });
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
    const message = `⚠️ Cannot save inspection!\n\n${this.missingPhotos.length} mandatory images are missing:\n\n${missingList}\n\nPlease go back and upload all required photos before saving.`;
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

    const photosValid = await this.checkMandatoryPhotosBeforeSave();
    if (!photosValid) {
      this.showMissingPhotosDialog();
      return;
    }

    this.saving = true;
    this.saveInProgress = true;
    const payload = this.buildFormData();
    const changedFields = this.getChangedFields();
    const changedFieldsStr = changedFields.map(f => f.fieldName).join(', ');

    this.inspectionSvc.updateInspectionDetails(this.valuationId, this.vehicleNumber, this.applicantContact, payload)
      .pipe(
        switchMap(() => this.workflowSvc.startWorkflow(this.valuationId, 3, this.vehicleNumber, encodeURIComponent(this.applicantContact))),
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
        switchMap(() => this.workflowSvc.completeWorkflow(this.valuationId, 3, this.vehicleNumber, encodeURIComponent(this.applicantContact))),
        switchMap(() => this.workflowSvc.startWorkflow(this.valuationId, 4, this.vehicleNumber, encodeURIComponent(this.applicantContact))),
        switchMap(() => this.qualityControlSvc.getValuationDetailsfromAI(this.valuationId, this.vehicleNumber, this.applicantContact)),
        switchMap(() => this.workflowSvc.updateWorkflowTable(this.valuationId, this.vehicleNumber, this.applicantContact, {
          workflow: 'QC',
          workflowStepOrder: 4,
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
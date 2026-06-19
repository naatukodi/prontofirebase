import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common'; 

// Models
import { Inspection } from '../../../models/Inspection';

// Services
import { InspectionService } from '../../../services/inspection.service';
import { AuthorizationService } from '../../../services/authorization.service';
import { WorkflowService } from '../../../services/workflow.service'; 
import { UsersService } from '../../../services/users.service';         

// Components
import { SharedModule } from '../../shared/shared.module/shared.module';
import { WorkflowButtonsComponent } from '../../workflow-buttons/workflow-buttons.component';
import { CommonNotesComponent } from '../../common-notes/common-notes.component';

type ValuationType =
  | 'four-wheeler'
  | 'cv'
  | 'two-wheeler'
  | 'three-wheeler'
  | 'tractor'
  | 'ce'
  | 'bus';

@Component({
  selector: 'app-valuation-inspection',
  standalone: true,
  imports: [
    SharedModule,
    WorkflowButtonsComponent,
    RouterModule,
    ReactiveFormsModule,
    CommonNotesComponent,
    CommonModule, 
    FormsModule   
  ],
  templateUrl: './inspection-view.component.html',
  styleUrls: ['./inspection-view.component.scss']
})
export class InspectionViewComponent implements OnInit {
  loading = true;
  error: string | null = null;
  inspection: Inspection | null = null;
  form!: FormGroup;

  valuationId!: string;
  vehicleNumber!: string;
  applicantContact!: string;
  valuationType: ValuationType | null = null;
  
  // ✅ UPDATED: Variable to hold the return message
  returnMessage: string | null = null;
  // ✅ UPDATED: Variable to store WHO returned the case
  returnedBy: string | null = null; 

  // --- RETURN VARIABLES (Renamed from Reject) ---
  showReturnModal: boolean = false;
  showOverrideModal: boolean = false;
  returnReason: string = '';
  
  // Override Data
  availableUsers: any[] = [];
  selectedOverrideUser: string = '';
  targetStep: string = 'Backend'; // AVO always returns to Backend

  private visibilityMap: Record<ValuationType, string[]> = {
    'four-wheeler': [
      'vehicleInspectedBy','inspectionDate','inspectionLocation','frontPhoto','odometer','engineCondition',
      'chassisCondition','steeringSystem','brakeSystem','suspensionSystem','fuelSystem',
      'tyreCondition','bodyCondition','cabinCondition','exteriorCondition','interiorCondition',
      'gearboxAssembly','clutchSystem','driveShafts','propellerShaft','differentialAssy',
      'radiator','interCooler','allHosePipes','paintWork','vinPlate','vehicleMoved','engineStarted','roadWorthyCondition','otherAccessoryFitment',
      'parkingBrake','abs','tailLightsIndicators','wiringAssy','frontCrashGuard','rearCrashGuard',
      'airBags','sunRoof','sideFenders'
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
    private inspectionService: InspectionService,
    private authz: AuthorizationService,
    private workflowService: WorkflowService, 
    private userService: UsersService         
  ) {}

  ngOnInit(): void {
    // 1. build form with all fields you use in template
    this.form = this.fb.group({
      vehicleInspectedBy: [''],
      dateOfInspection: [''],
      inspectionLocation: [''],
      vehicleMoved: [null],
      engineStarted: [null],
      odometer: [null],
      vinPlate: [null],
      bodyType: [''],
      overallTyreCondition: [''],
      otherAccessoryFitment: [null],
      windshieldGlass: [''],
      roadWorthyCondition: [null],
      engineCondition: [''],
      suspensionSystem: [''],
      steeringSystem: [''],
      steeringWheel: [''],
      steeringColumn: [''],
      steeringBox: [''],
      steeringLinkages: [''],
      fuelSystem: [''],
      brakeSystem: [''],
      chassisCondition: [''],
      exteriorCondition: [''],
      interiorCondition: [''],
      bonnet: [''],
      bodyCondition: [''],
      batteryCondition: [''],
      paintWork: [''],
      audio: [''],
      clutchSystem: [''],
      gearBoxAssy: [''],
      propellerShaft: [''],
      mudguards: [''],
      allGlasses: [''],
      boom: [''],
      bucket: [''],
      chainTrack: [''],
      hydraulicCylinders: [''],
      swingUnit: [''],
      differentialAssy: [''],
      cabin: [''],
      dashboard: [''],
      seats: [''],
      upholstery: [''],
      interiorTrims: [''],
      headLamps: [''],
      front: [''],
      rear: [''],
      axles: [''],
      airConditioner: [''],
      electricAssembly: [''],
      radiator: [''],
      intercooler: [''],
      allHosePipes: [''],
      frontPhoto: ['']
    });

    // 2. start loading route params
    this.route.paramMap.subscribe(params => {
      const vid = params.get('valuationId');
      if (vid) {
        this.valuationId = vid;
        this.loadQueryParamsAndFetch();
      } else {
        this.loading = false;
        this.error = 'Valuation ID is missing in the route.';
      }
    });
  }

  private loadQueryParamsAndFetch() {
    this.route.queryParamMap.subscribe(qp => {
      const vn = qp.get('vehicleNumber');
      const ac = qp.get('applicantContact');
      this.valuationType = qp.get('valuationType') as ValuationType | null;
      
      if (vn && ac) {
        this.vehicleNumber = vn;
        this.applicantContact = ac;
        
        // 1. Fetch Inspection Data
        this.fetchInspection();

        // 2. ✅ Fetch Return Status (Renamed)
        this.checkReturnStatus(this.valuationId, vn, ac);

      } else {
        this.loading = false;
        this.error = 'Missing required query parameters.';
      }
    });
  }

  // ✅ ROBUST RETURN CHECKER & PARSER
  private checkReturnStatus(id: string, vn: string, ac: string) {
    this.workflowService.getTable(id, vn, ac).subscribe({
      next: (table: any) => {
        // Debugging
        console.log('InspectionView: Workflow Table Response:', table);

        const isRedFlag = String(table?.redFlag || table?.RedFlag || 'false').toLowerCase() === 'true';
        const remark = table?.remarks || table?.Remarks || '';

        // ✅ CHECK: Is the current step "AVO"?
        const currentStep = table?.workflow || table?.Workflow || '';
        const isAVOStep = currentStep === 'AVO';

        // ONLY show banner if RedFlag is True AND we are currently in AVO step
        if (isRedFlag && remark && isAVOStep) {
          // 1. Normalize string for checking
          const remarkUpper = remark.toUpperCase();
          // ✅ UPDATED PREFIX CHECK
          const prefix = "RETURNED BY ";

          // 2. Check if it starts with "RETURNED BY " (Case Insensitive)
          if (remarkUpper.startsWith(prefix)) {
            const splitIndex = remark.indexOf(':'); // Find the first colon
            
            if (splitIndex !== -1) {
              // Extract the name (Length of "RETURNED by " is 12)
              const returnerName = remark.substring(12, splitIndex).trim();
              
              // ⛔️ STALE/INVALID RETURN CHECK ⛔️
              // We should not see "Returned By AVO" if we are IN AVO step (circular).
              const invalidReturners = ['AVO', 'STAKEHOLDER'];
              
              if (invalidReturners.includes(returnerName.toUpperCase())) {
                 console.log(`InspectionView: Stale/Invalid Return detected from [${returnerName}]. Hiding banner.`);
                 this.returnedBy = null;
                 this.returnMessage = null;
                 return; // Stop here
              }

              this.returnedBy = returnerName;
              this.returnMessage = remark.substring(splitIndex + 1).trim();
            } else {
              // Fallback for malformed strings
              this.returnedBy = "Previous Stage"; 
              this.returnMessage = remark;
            }
          } 
          // 3. Fallback: Data exists but doesn't have the prefix
          else {
            this.returnedBy = null; 
            this.returnMessage = remark;
          }

          console.log(`✅ PARSED: By [${this.returnedBy}] -> Reason: [${this.returnMessage}]`);

        } else {
          // No Red Flag OR Not current step -> Hide banner
          this.returnMessage = null;
          this.returnedBy = null;
          console.log('InspectionView: No return flag active for this step.');
        }
      },
      error: (err) => console.error('InspectionView: Failed to fetch workflow table', err)
    });
  }

  private fetchInspection() {
    this.loading = true;
    this.error = null;

    this.inspectionService
      .getInspectionDetails(this.valuationId, this.vehicleNumber, this.applicantContact)
      .subscribe({
        next: data => {
          this.inspection = data;
          // 3. patch form with incoming data
          this.form.patchValue({
            vehicleInspectedBy: data.vehicleInspectedBy,
            dateOfInspection: data.dateOfInspection,
            inspectionLocation: data.inspectionLocation,
            vehicleMoved: data.vehicleMoved,
            engineStarted: data.engineStarted,
            odometer: data.odometer,
            vinPlate: data.vinPlate,
            bodyType: data.bodyType,
            overallTyreCondition: data.overallTyreCondition,
            otherAccessoryFitment: data.otherAccessoryFitment,
            windshieldGlass: data.windshieldGlass,
            roadWorthyCondition: data.roadWorthyCondition,
            engineCondition: data.engineCondition,
            suspensionSystem: data.suspensionSystem,
            steeringSystem: data.steeringSystem || (data as any).steeringAssy,
            steeringWheel: (data as any).steeringWheel,
            steeringColumn: (data as any).steeringColumn,
            steeringBox: (data as any).steeringBox,
            steeringLinkages: (data as any).steeringLinkages,
            fuelSystem: data.fuelSystem,
            brakeSystem: data.brakeSystem,
            chassisCondition: data.chassisCondition,
            exteriorCondition: data.exteriorCondition,
            interiorCondition: (data as any).interiorCondition,
            bonnet: (data as any).bonnet,
            bodyCondition: data.bodyCondition,
            batteryCondition: data.batteryCondition,
            paintWork: data.paintWork,
            audio: (data as any).audio,
            clutchSystem: data.clutchSystem,
            gearBoxAssy: data.gearBoxAssy,
            propellerShaft: data.propellerShaft,
            mudguards: (data as any).mudguards,
            allGlasses: (data as any).allGlasses,
            boom: (data as any).boom,
            bucket: (data as any).bucket,
            chainTrack: (data as any).chainTrack,
            hydraulicCylinders: (data as any).hydraulicCylinders,
            swingUnit: (data as any).swingUnit,
            differentialAssy: data.differentialAssy,
            cabin: (data as any).cabin,
            dashboard: (data as any).dashboard,
            seats: (data as any).seats,
            upholstery: (data as any).upholstery || (data as any).upholestry,
            interiorTrims: (data as any).interiorTrims,
            headLamps: (data as any).headLamps,
            front: (data as any).front,
            rear: (data as any).rear,
            axles: (data as any).axles,
            airConditioner: (data as any).airConditioner,
            electricAssembly: data.electricAssembly,
            radiator: data.radiator,
            intercooler: (data as any).intercooler,
            allHosePipes: data.allHosePipes,
            remarks: data.remarks
          });
          this.loading = false;
        },
        error: (err: HttpErrorResponse) => {
          this.error = err.message || 'Failed to load inspection';
          this.loading = false;
        }
      });
  }

  showField(key: string): boolean {
    if (!this.valuationType) return false;
    return this.visibilityMap[this.valuationType]?.includes(key) ?? false;
  }

  hv(keys: string[]): boolean {
    return keys.some(k => this.showField(k));
  }

  displayBool(val: any, trueLabel: string = 'Yes', falseLabel: string = 'No'): string {
    if (val === true || val === 'true') return trueLabel;
    if (val === false || val === 'false') return falseLabel;
    return val ?? '';
  }

  onClick() {
    this.router.navigate(
      ['/valuation', this.valuationId, 'inspection', 'vehicle-image-upload'],
      { queryParams: {
          vehicleNumber: this.vehicleNumber,
          applicantContact: this.applicantContact,
          valuationType: this.valuationType
      } }
    );
  }

  onEdit() {
    this.router.navigate(
      ['/valuation', this.valuationId, 'inspection', 'update'],
      { queryParams: {
          vehicleNumber: this.vehicleNumber,
          applicantContact: this.applicantContact,
          valuationType: this.valuationType
      } }
    );
  }

  onDelete(): void {
    if (!confirm('Delete this inspection record?')) return;
    this.inspectionService
      .deleteInspectionDetails(this.valuationId, this.vehicleNumber, this.applicantContact)
      .subscribe({
        next: () => this.router.navigate(['/']),
        error: err => (this.error = err.message || 'Delete failed')
      });
  }

  onBack(): void {
    this.router.navigate(
      ['/valuation', this.valuationId],
      { queryParams: {
          vehicleNumber: this.vehicleNumber,
          applicantContact: this.applicantContact,
          valuationType: this.valuationType
      } }
    );
  }

  canEditInspection() {
    return this.authz.hasAnyPermission(['CanEditInspection']);
  }

  canDeleteInspection() {
    return this.authz.hasAnyPermission(['CanDeleteInspection']);
  }

  getCurrentUserObj(): any {
    try {
      const userJson = localStorage.getItem('currentUser') || localStorage.getItem('user') || '{}';
      return JSON.parse(userJson);
    } catch {
      return {};
    }
  }

  getCurrentUser(): string {
    const user = this.getCurrentUserObj();
    return user.name || user.username || user.email || 'User';
  }

  // =================================================================
  //  RETURN LOGIC (AVO -> Backend)
  // =================================================================

  openReturnModal() {
    this.returnReason = '';
    this.showReturnModal = true;
  }

  submitReturn() {
    if (!this.returnReason) {
      alert("Please provide a reason for returning.");
      return;
    }
    // Attempt return without override first
    this.callReturnApi("");
  }

  callReturnApi(overrideId: string) {
    const currentUserJson = this.getCurrentUserObj(); 
    
    // ✅ CALLING THE RENAMED SERVICE METHOD
    this.workflowService.returnWorkflow(
      this.valuationId,
      this.vehicleNumber,
      this.applicantContact,
      "AVO",              // Current Step
      this.returnReason,  // Reason
      currentUserJson.userId || '',
      currentUserJson.name || '',
      this.targetStep,    // 'Backend'
      overrideId          // Optional Override
    ).subscribe({
      next: () => {
        alert("Case Returned Successfully. Sent back to Backend.");
        this.closeModals();
        this.onBack(); // Return to dashboard
      },
      error: (err: any) => {
        // Handle 400 Error -> Open Override Modal
        if (err.status === 400 && err.error?.message?.includes("overrideAssigneeId")) {
          this.showReturnModal = false; // Close reason modal
          this.fetchBackendUsers();     // Load users for override
        } else {
          alert("Error: " + (err.error?.message || "Unknown error occurred"));
        }
      }
    });
  }

  fetchBackendUsers() {
    this.userService.getUsersByRole('BackEnd').subscribe({
      next: (users: any[]) => {
        this.availableUsers = users;
        this.showOverrideModal = true;
      },
      error: () => {
        alert("Could not fetch user list for override. Please contact admin.");
        this.showOverrideModal = false;
      }
    });
  }

  confirmOverride() {
    if (this.selectedOverrideUser) {
      this.callReturnApi(this.selectedOverrideUser);
    }
  }

  closeModals() {
    this.showReturnModal = false;
    this.showOverrideModal = false;
  }
}
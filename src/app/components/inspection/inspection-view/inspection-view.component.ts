// src/app/valuation-inspection/inspection-view.component.ts
import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Inspection } from '../../../models/Inspection';
import { InspectionService } from '../../../services/inspection.service';
import { AuthorizationService } from '../../../services/authorization.service';
import { SharedModule } from '../../shared/shared.module/shared.module';
import { WorkflowButtonsComponent } from '../../workflow-buttons/workflow-buttons.component';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

type ValuationType =
  | 'four-wheeler'
  | 'cv'
  | 'two-wheeler'
  | 'three-wheeler'
  | 'tractor'
  | 'ce';

@Component({
  selector: 'app-valuation-inspection',
  standalone: true,
  imports: [
    SharedModule,
    WorkflowButtonsComponent,
    RouterModule,
    ReactiveFormsModule
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

  private authz = new AuthorizationService();

  private visibilityMap: Record<ValuationType, string[]> = {
   'four-wheeler': [
      'vehicleInspectedBy','inspectionDate','inspectionLocation','frontPhoto','odometer','engineCondition',
      'chassisCondition','steeringSystem','brakeSystem','suspensionSystem','fuelSystem',
      'tyreCondition','bodyCondition','cabinCondition','exteriorCondition','interiorCondition',
      'gearboxAssembly','clutchSystem','driveShafts','propellerShaft','differentialAssy',
      'radiator','interCooler','allHosePipes','paintWork','vinPlate','vehicleMoved','engineStarted','roadWorthyCondition','otherAccessoryFitment'
    ],
    'cv': [
      'vehicleInspectedBy','inspectionDate','inspectionLocation','frontPhoto','odometer','engineCondition',
      'chassisCondition','steeringSystem','brakeSystem','electricalSystem','suspensionSystem',
      'fuelSystem','tyreCondition','bodyCondition','cabinCondition','exteriorCondition',
      'interiorCondition','gearboxAssembly','clutchSystem','propellerShaft','differentialAssy',
      'radiator','interCooler','allHosePipes','steeringWheel','steeringColumn','steeringBox',
      'steeringLinkages','bumpers','doors','mudguards','allGlasses','dashBoard','seats',
      'upholestry','interiorTrims','front','rear','axles','airConditioner','audio','paintWork',
      'rightSideWing','leftSideWing','tailGate','loadFloor','vinPlate','vehicleMoved','engineStarted','roadWorthyCondition','otherAccessoryFitment'
    ],
    'two-wheeler': [
      'vehicleInspectedBy','inspectionDate','inspectionLocation','frontPhoto','odometer','engineCondition',
      'chassisCondition','steeringSystem','brakeSystem','electricalSystem','suspensionSystem',
      'fuelSystem','tyreCondition','bodyCondition','exteriorCondition','gearboxAssembly',
      'clutchSystem','steeringHandle','frontForkAssy','mudguards','frontFairing','rearCowls',
      'seats','speedoMeter','front','rear','paintWork','vinPlate','vehicleMoved','engineStarted','roadWorthyCondition','otherAccessoryFitment'
    ],
    'three-wheeler': [
      'vehicleInspectedBy','inspectionDate','inspectionLocation','frontPhoto','odometer','engineCondition',
      'chassisCondition','steeringSystem','brakeSystem','electricalSystem','suspensionSystem',
      'fuelSystem','tyreCondition','bodyCondition','cabinCondition','exteriorCondition',
      'interiorCondition','gearboxAssembly','clutchSystem','driveShafts','radiator','interCooler',
      'allHosePipes','steeringColumn','steeringBox','steeringLinkages','steeringHandle',
      'frontForkAssy','mudguards','allGlasses','dashBoard','seats','upholestry','interiorTrims',
      'front','rear','axles','airConditioner','audio','paintWork','vinPlate','vehicleMoved','engineStarted','roadWorthyCondition','otherAccessoryFitment'
    ],
    'tractor': [
      'vehicleInspectedBy','inspectionDate','inspectionLocation','frontPhoto','odometer','engineCondition',
      'chassisCondition','steeringSystem','brakeSystem','electricalSystem','suspensionSystem',
      'fuelSystem','tyreCondition','bodyCondition','exteriorCondition','gearboxAssembly',
      'clutchSystem','differentialAssy','radiator','interCooler','allHosePipes','steeringWheel',
      'steeringColumn','steeringBox','steeringLinkages','bonnet','bumpers','mudguards','seats',
      'front','rear','axles','paintWork','vinPlate','vehicleMoved','engineStarted','roadWorthyCondition','otherAccessoryFitment'
    ],
    'ce': [
      'vehicleInspectedBy','inspectionDate','inspectionLocation','frontPhoto','odometer','engineCondition',
      'chassisCondition','steeringSystem','brakeSystem','electricalSystem','suspensionSystem',
      'fuelSystem','tyreCondition','bodyCondition','cabinCondition','exteriorCondition',
      'interiorCondition','gearboxAssembly','clutchSystem','radiator','interCooler','allHosePipes',
      'steeringWheel','steeringColumn','steeringBox','steeringLinkages','bonnet','mudguards',
      'allGlasses','boom','bucket','chainTrack','hydraulicCylinders','swingUnit','dashBoard',
      'seats','upholestry','interiorTrims','front','rear','axles','airConditioner','paintWork','vinPlate','vehicleMoved','engineStarted','roadWorthyCondition','otherAccessoryFitment'
    ]
  };

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private inspectionService: InspectionService
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
      steeringAssy: [''],
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
      upholestry: [''],
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
        this.fetchInspection();
      } else {
        this.loading = false;
        this.error = 'Missing required query parameters.';
      }
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
            steeringAssy: data.steeringAssy,
            steeringWheel: (data as any).steeringWheel,        // if present
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
            upholestry: (data as any).upholestry,
            interiorTrims: (data as any).interiorTrims,
            headLamps: (data as any).headLamps,
            front: (data as any).front,
            rear: (data as any).rear,
            axles: (data as any).axles,
            airConditioner: (data as any).airConditioner,
            electricAssembly: data.electricAssembly,
            radiator: data.radiator,
            intercooler: (data as any).intercooler,
            allHosePipes: data.allHosePipes
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
    return this.authz.hasAnyPermission(['CanCreateInspection','CanEditInspection']);
  }

  canDeleteInspection() {
    return this.authz.hasAnyPermission(['CanDeleteInspection']);
  }
}

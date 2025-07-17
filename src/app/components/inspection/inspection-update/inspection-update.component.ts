// src/app/valuation‐inspection‐update/valuation‐inspection‐update.component.ts

// src/app/valuation-inspection-update/inspection-update.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InspectionService } from '../../../services/inspection.service';
import { Inspection } from '../../../models/Inspection';
import { MatSnackBar } from '@angular/material/snack-bar';
import { switchMap } from 'rxjs/operators';
import { WorkflowService } from '../../../services/workflow.service';
import { QualityControlService } from '../../../services/quality-control.service';
import { SharedModule } from '../../shared/shared.module/shared.module';
import { WorkflowButtonsComponent } from '../../workflow-buttons/workflow-buttons.component';
import { RouterModule } from '@angular/router';

type ValuationType =
  | 'four-wheeler'
  | 'cv'
  | 'two-wheeler'
  | 'three-wheeler'
  | 'tractor'
  | 'ce';

@Component({
  selector: 'app-valuation-inspection-update',
  standalone: true,
  imports: [SharedModule, WorkflowButtonsComponent, RouterModule],
  templateUrl: './inspection-update.component.html',
  styleUrls: ['./inspection-update.component.scss']
})
export class InspectionUpdateComponent implements OnInit {
  // identifiers
  valuationId!: string;
  vehicleNumber!: string;
  applicantContact!: string;
  valuationType: ValuationType | null = null;

  /** YYYY-MM-DD for today, used in template max= binding */
  maxDate: string = '';

  // form state
  form!: FormGroup;
  loading = true;
  error: string | null = null;
  saving = false;
  saveInProgress = false;
  submitInProgress = false;
  saved = false;

  // photo uploads
  photoFiles: File[] = [];

  // visibility map same as view
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
    private inspectionSvc: InspectionService,
    private workflowSvc: WorkflowService,
    private qualityControlSvc: QualityControlService,
    private _snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {

    // compute today’s date
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2,'0');
    const dd = String(today.getDate()).padStart(2,'0');
    this.maxDate = `${yyyy}-${mm}-${dd}`;

    this.valuationId = this.route.snapshot.paramMap.get('valuationId')!;
    
    this.route.queryParamMap.subscribe(params => {
      const vn = params.get('vehicleNumber');
      const ac = params.get('applicantContact');
      this.valuationType = params.get('valuationType') as ValuationType | null;
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

 showField(key: string): boolean {
    return !!(
      this.valuationType &&
      this.visibilityMap[this.valuationType]?.includes(key)
    );
  }

  private initForm() {
    this.form = this.fb.group({
      vehicleInspectedBy: ['', Validators.required],
      dateOfInspection: [
        '',
        [
          Validators.required,
          this.pastOrTodayValidator()
        ]
      ],
      inspectionLocation: ['', Validators.required],
      vehicleMoved: ['',false],
      engineStarted: ['',false],
      odometer: [0, Validators.min(0)],
      vinPlate: ['',false],
      bodyType: ['',false],
      overallTyreCondition: ['',false],
      otherAccessoryFitment: ['',false],
      windshieldGlass: ['',false],
      roadWorthyCondition: ['',false],
      engineCondition: ['', false],
      suspensionSystem: ['', false],
      steeringAssy: ['', false],
      brakeSystem: ['', false],
      chassisCondition: ['', false],
      bodyCondition: ['', false],
      batteryCondition: ['', false],
      paintWork: ['', false],
      clutchSystem: ['', false],
      gearBoxAssy: ['', false],
      propellerShaft: ['', false],
      differentialAssy: ['', false],
      cabin: ['', false],
      dashboard: ['', false],
      seats: ['', false],
      headLamps: ['', false],
      electricAssembly: ['', false],
      radiator: ['', false],
      intercooler: ['', false],
      allHosePipes: ['', false],
       // --- new controls to match your template ---
    fuelSystem: ['', false],
    exteriorCondition: ['', false],
    interiorCondition: ['', false],
    steeringWheel: ['', false],
    steeringColumn: ['', false],
    steeringBox: ['', false],
    steeringLinkages: ['', false],

    bonnet: ['', false],
    mudguards: ['', false],
    allGlasses: [false],
    boom: ['', false],
    bucket: ['', false],
    chainTrack:['', false],
    hydraulicCylinders: ['', false],
    swingUnit: ['', false],
    upholestry: ['', false],
    interiorTrims: ['', false],
    front: ['', false],
    rear:['', false],
    axles:['', false],
    airConditioner: ['', false],
    audio: ['', false]
    });
  }

  private loadInspection() {
    this.loading = true;
    this.error = null;
    this.inspectionSvc
      .getInspectionDetails(this.valuationId, this.vehicleNumber, this.applicantContact)
      .subscribe({
        next: data => {
          this.patchForm(data);
          this.loading = false;
        },
        error: err => {
          this.error = err.message || 'Failed to load inspection details.';
          this.loading = false;
        }
      });
  }

  private patchForm(data: Inspection) {
    const v = this.form;
    v.patchValue({
      vehicleInspectedBy: data.vehicleInspectedBy,
      dateOfInspection: data.dateOfInspection?.slice(0,10) ?? '',
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
      brakeSystem: data.brakeSystem,
      chassisCondition: data.chassisCondition,
      bodyCondition: data.bodyCondition,
      batteryCondition: data.batteryCondition,
      paintWork: data.paintWork,
      clutchSystem: data.clutchSystem,
      gearBoxAssy: data.gearBoxAssy,
      propellerShaft: data.propellerShaft,
      differentialAssy: data.differentialAssy,
      cabin: data.cabin,
      dashboard: data.dashboard,
      seats: data.seats,
      headLamps: data.headLamps,
      electricAssembly: data.electricAssembly,
      radiator: data.radiator,
      intercooler: data.intercooler,
      allHosePipes: data.allHosePipes,
      // new fields:
    fuelSystem: data.fuelSystem,
    exteriorCondition: data.exteriorCondition,
    interiorCondition: data.interiorCondition,
    steeringWheel: data.steeringWheel,
    steeringColumn: data.steeringColumn,
    steeringBox: data.steeringBox,
    steeringLinkages: data.steeringLinkages,
    bonnet: data.bonnet,
    mudguards: data.mudguards,
    allGlasses: data.allGlasses,
    boom: data.boom,
    bucket: data.bucket,
    chainTrack: data.chainTrack,
    hydraulicCylinders: data.hydraulicCylinders,
    swingUnit: data.swingUnit,
    upholestry: data.upholestry,
    interiorTrims: data.interiorTrims,
    front: data.front,
    rear: data.rear,
    axles: data.axles,
    airConditioner: data.airConditioner,
    audio: data.audio
    });
  }

    /** Validator: date must be <= today */
  pastOrTodayValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const input = new Date(control.value);
      const today = new Date(this.maxDate);
      // zero out time for safe comparison
      input.setHours(0,0,0,0);
      today.setHours(0,0,0,0);
      return input <= today ? null : { futureDate: true };
    };
  }

  onPhotoChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.photoFiles = input.files ? Array.from(input.files) : [];
  }

  private buildFormData(): FormData {
    const fd = new FormData();
    const v = this.form.getRawValue();
    Object.keys(v).forEach(k => fd.append(k, v[k]));
    this.photoFiles.forEach(file => fd.append('photos', file, file.name));
    fd.append('valuationId', this.valuationId);
    fd.append('vehicleNumber', this.vehicleNumber);
    fd.append('applicantContact', this.applicantContact);
    return fd;
  }

  onClick() {
    this.router.navigate(['/valuation', this.valuationId, 'inspection','vehicle-image-upload'], {
      queryParams: { vehicleNumber: this.vehicleNumber, applicantContact: this.applicantContact, valuationType: this.valuationType }
    });
  }

  // In your InspectionUpdateComponent:

  /** Only patch visible controls to defaults */
 public updateDefaultValues(): void {
    if (!this.valuationType) { return; }
    const defaults: Record<string, any> = {};
    Object.keys(this.form.controls).forEach(key => {
      if (!this.showField(key)) { return; }
      const control = this.form.get(key)!;
      if (control.value === '' || control.value == null) {
        // string or null defaults to 'Good'
        if (control instanceof FormControl || typeof control.value === 'string') {
          defaults[key] = 'Good';
        }
      } else if (typeof control.value === 'boolean') {
        // boolean fields default to true
        defaults[key] = true;
      }
    });
    this.form.patchValue(defaults);
  }


  onSave() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.saveInProgress = true;

    const payload = this.buildFormData();
    this.inspectionSvc
      .updateInspectionDetails(this.valuationId, this.vehicleNumber, this.applicantContact, payload)
      .pipe(
        // After successful update, start workflow
        switchMap(() => this.workflowSvc.startWorkflow(this.valuationId, 3, this.vehicleNumber, encodeURIComponent(this.applicantContact)))
        ,
        switchMap(() =>
          this.workflowSvc.updateWorkflowTable(
            this.valuationId,
            this.vehicleNumber,
            this.applicantContact,
            'AVO',
            3
          )
        )
      )
      .subscribe({
        next: () => {
          this.saveInProgress = false;
          this.saving = false;
          this.saved = true;  // Indicate that save was successful
          this._snackBar.open('Inspection saved successfully', 'Close', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
        },
        error: (err) => {
          this.error = err.message || 'Save failed.';
          this.saveInProgress = false;
          this.saving = false;
        }
      });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.submitInProgress = true;

    const payload = this.buildFormData();
    this.inspectionSvc
      .updateInspectionDetails(this.valuationId, this.vehicleNumber, this.applicantContact, payload)
      .pipe(
      // Complete workflow with step 1
      switchMap(() => this.workflowSvc.completeWorkflow(this.valuationId, 3, this.vehicleNumber, encodeURIComponent(this.applicantContact))),
      // Start workflow with step 2
      switchMap(() => this.workflowSvc.startWorkflow(this.valuationId, 4, this.vehicleNumber, encodeURIComponent(this.applicantContact))),
      // Get valuation details from AI
      switchMap(() => this.qualityControlSvc.getValuationDetailsfromAI(this.valuationId, this.vehicleNumber, this.applicantContact))
      ,
        switchMap(() =>
          this.workflowSvc.updateWorkflowTable(
            this.valuationId,
            this.vehicleNumber,
            this.applicantContact,
            'QC',
            4
          )
        )
      )
      .subscribe({
      next: () => {
        // After submit, navigate back to the inspection view
        this.router.navigate(['/valuation', this.valuationId, 'inspection'], {
        queryParams: {
          vehicleNumber: this.vehicleNumber,
          applicantContact: this.applicantContact,
          valuationType: this.valuationType
        }
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
      queryParams: {
        vehicleNumber: this.vehicleNumber,
        applicantContact: this.applicantContact,
        valuationType: this.valuationType
      }
    });
  }
}

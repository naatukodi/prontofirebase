// src/app/valuation-inspection-update/inspection-update.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InspectionService } from '../../../services/inspection.service';
import { VehicleInspectionService } from '../../../services/vehicle-inspection.service';
import { Inspection } from '../../../models/Inspection';
import { MatSnackBar } from '@angular/material/snack-bar';
import { switchMap } from 'rxjs/operators';
import { WorkflowService } from '../../../services/workflow.service';
import { QualityControlService } from '../../../services/quality-control.service';
import { SharedModule } from '../../shared/shared.module/shared.module';
import { WorkflowButtonsComponent } from '../../workflow-buttons/workflow-buttons.component';
import { RouterModule } from '@angular/router';
import { Auth, User, authState } from '@angular/fire/auth';
import { take, Observable } from 'rxjs';

// ✅ IMPORT HISTORY LOGGER SERVICE
import { HistoryLoggerService } from '../../../services/history-logger.service';


type ValuationType = 'four-wheeler' | 'cv' | 'two-wheeler' | 'three-wheeler' | 'tractor' | 'ce';


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

  photoFiles: File[] = [];

  private assignedTo = '';
  private assignedToPhoneNumber = '';
  private assignedToEmail = '';
  private assignedToWhatsapp = '';

  // ✅ ADD THESE FOR TRACKING
  private currentUser: User | null = null;
  private currentUserId: string = 'unknown';
  private currentUserName: string = 'Unknown User';
  private originalFormData: any = {};

  // Mandatory photo validation state
  isSaving: boolean = false;
  mandatoryPhotosError: string | null = null;
  missingPhotos: string[] = [];

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
    private vehicleInspectionService: VehicleInspectionService,
    private workflowSvc: WorkflowService,
    private qualityControlSvc: QualityControlService,
    private _snackBar: MatSnackBar,
    private auth: Auth,
    private historyLogger: HistoryLoggerService  // ✅ INJECT
  ) {}

  ngOnInit(): void {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2,'0');
    const dd = String(today.getDate()).padStart(2,'0');
    this.maxDate = `${yyyy}-${mm}-${dd}`;

    this.valuationId = this.route.snapshot.paramMap.get('valuationId')!;
    
    // ✅ GET CURRENT USER INFO
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

  private applyAssignedFromUser(u: User | null): void {
    const name = (u?.displayName?.trim() || '') || (u?.email ? u.email.split('@')[0] : '') || (u?.phoneNumber || '') || 'User';
    this.assignedTo = name;
    this.assignedToPhoneNumber = u?.phoneNumber || '';
    this.assignedToEmail = u?.email || '';
    this.assignedToWhatsapp = u?.phoneNumber || '';
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
      steeringAssy: [''],
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
      upholestry: [''],
      interiorTrims: [''],
      front: [''],
      rear: [''],
      axles: [''],
      airConditioner: [''],
      audio: ['']
    });
  }

  private loadInspection() {
    this.loading = true;
    this.error = null;
    this.inspectionSvc.getInspectionDetails(this.valuationId, this.vehicleNumber, this.applicantContact).subscribe({
      next: data => {
        console.log('✅ Inspection Data Loaded:', data);
        this.patchForm(data);
        // ✅ STORE ORIGINAL DATA
        this.originalFormData = JSON.parse(JSON.stringify(this.form.getRawValue()));
        this.loading = false;
        this.checkMandatoryPhotosBeforeSave().then(isComplete => {
          console.log('📸 Photo Validation Result:', {
            isComplete: isComplete,
            missingPhotos: this.missingPhotos,
            errorMessage: this.mandatoryPhotosError
          });
        });
      },
      error: err => {
        console.error('❌ Error Loading Inspection:', err);
        this.error = err.message || 'Failed to load inspection details.';
        this.loading = false;
      }
    });
  }

  private patchForm(data: Inspection) {
    const v = this.form;
    v.patchValue({
      vehicleInspectedBy: data.vehicleInspectedBy || '',
      dateOfInspection: data.dateOfInspection?.slice(0, 10) || '',
      inspectionLocation: data.inspectionLocation || '',
      vehicleMoved: data.vehicleMoved || false,
      engineStarted: data.engineStarted || false,
      odometer: data.odometer || 0,
      vinPlate: data.vinPlate || false,
      bodyType: data.bodyType || '',
      overallTyreCondition: data.overallTyreCondition || '',
      otherAccessoryFitment: data.otherAccessoryFitment || false,
      windshieldGlass: data.windshieldGlass || '',
      roadWorthyCondition: data.roadWorthyCondition || false,
      engineCondition: data.engineCondition || '',
      suspensionSystem: data.suspensionSystem || '',
      steeringAssy: data.steeringAssy || '',
      brakeSystem: data.brakeSystem || '',
      chassisCondition: data.chassisCondition || '',
      bodyCondition: data.bodyCondition || '',
      batteryCondition: data.batteryCondition || '',
      paintWork: data.paintWork || '',
      clutchSystem: data.clutchSystem || '',
      gearBoxAssy: data.gearBoxAssy || '',
      propellerShaft: data.propellerShaft || '',
      differentialAssy: data.differentialAssy || '',
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
      upholestry: data.upholestry || '',
      interiorTrims: data.interiorTrims || '',
      front: data.front || '',
      rear: data.rear || '',
      axles: data.axles || '',
      airConditioner: data.airConditioner || '',
      audio: data.audio || ''
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
    const input = event.target as HTMLInputElement;
    this.photoFiles = input.files ? Array.from(input.files) : [];
  }

  // ✅ NEW METHOD: TRACK CHANGED FIELDS
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

  private buildFormData(): FormData {
    const fd = new FormData();
    const v = this.form.getRawValue();
    Object.keys(v).forEach(k => fd.append(k, v[k]));
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
      queryParams: { vehicleNumber: this.vehicleNumber, applicantContact: this.applicantContact, valuationType: this.valuationType }
    });
  }

  public updateDefaultValues(): void {
    if (!this.valuationType) { return; }
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
      queryParams: { vehicleNumber: this.vehicleNumber, applicantContact: this.applicantContact, valuationType: this.valuationType }
    });
  }

  // ✅ NEW METHOD: LOG HISTORY
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
        // ✅ LOG HISTORY
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
        // ✅ LOG HISTORY
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

// src/app/valuation‐inspection‐update/valuation‐inspection‐update.component.ts

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
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

@Component({
  selector: 'app-valuation-inspection-update',
  imports: [SharedModule, WorkflowButtonsComponent, RouterModule],
  standalone: true,
  templateUrl: './inspection-update.component.html',
  styleUrls: ['./inspection-update.component.scss']
})
export class InspectionUpdateComponent implements OnInit {
  valuationId!: string;
  vehicleNumber!: string;
  applicantContact!: string;

  form!: FormGroup;
  loading = true;
  error: string | null = null;
  saving = false;
  saveInProgress = false;
  submitInProgress = false;

  // For photo uploads
  photoFiles: File[] = [];

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
    // 1) Read route param: valuationId
    this.valuationId = this.route.snapshot.paramMap.get('valuationId')!;

    // 2) Read query params: vehicleNumber, applicantContact
    this.route.queryParamMap.subscribe(params => {
      const vn = params.get('vehicleNumber');
      const ac = params.get('applicantContact');
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

  private initForm() {
    this.form = this.fb.group({
      // Basic Inspection Info
      vehicleInspectedBy: ['', Validators.required],
      dateOfInspection: ['', Validators.required],      // ISO date string (YYYY-MM-DD)
      inspectionLocation: ['', Validators.required],

      // Basic Vehicle Checks
      vehicleMoved: [false],
      engineStarted: [false],
      odometer: [0, Validators.min(0)],
      vinPlate: [false],
      bodyType: ['', Validators.required],
      overallTyreCondition: ['', Validators.required],
      otherAccessoryFitment: [false],

      // External Visual Checks
      windshieldGlass: ['', Validators.required],
      roadWorthyCondition: [false],
      engineCondition: ['', Validators.required],
      suspensionSystem: ['', Validators.required],
      steeringAssy: ['', Validators.required],
      brakeSystem: ['', Validators.required],

      // Structural & Body Checks
      chassisCondition: ['', Validators.required],
      bodyCondition: ['', Validators.required],
      batteryCondition: ['', Validators.required],
      paintWork: ['', Validators.required],
      clutchSystem: ['', Validators.required],
      gearBoxAssy: ['', Validators.required],
      propellerShaft: ['', Validators.required],
      differentialAssy: ['', Validators.required],

      // Interior & Electrical Checks
      cabin: ['', Validators.required],
      dashboard: ['', Validators.required],
      seats: ['', Validators.required],
      headLamps: ['', Validators.required],
      electricAssembly: ['', Validators.required],
      radiator: ['', Validators.required],
      intercooler: ['', Validators.required],
      allHosePipes: ['', Validators.required]
    });
  }

  private loadInspection() {
    this.loading = true;
    this.error = null;

    this.inspectionSvc
      .getInspectionDetails(this.valuationId, this.vehicleNumber, this.applicantContact)
      .subscribe({
        next: (data: Inspection) => {
          this.patchForm(data);
          this.loading = false;
        },
        error: (err) => {
          this.error = err.message || 'Failed to load inspection details.';
          this.loading = false;
        }
      });
  }

  private patchForm(data: Inspection) {
    this.form.patchValue({
      vehicleInspectedBy: data.vehicleInspectedBy,
      dateOfInspection: data.dateOfInspection?.slice(0, 10) || '',
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
      allHosePipes: data.allHosePipes
    });

    // We do not preload existing photos into photoFiles (only allow new uploads here).
  }

  onPhotoChange(event: Event) {
    const inputEl = event.target as HTMLInputElement;
    this.photoFiles = inputEl.files ? Array.from(inputEl.files) : [];
  }

  private buildFormData(): FormData {
    const fd = new FormData();
    const v = this.form.getRawValue();

    // Append each field
    fd.append('vehicleInspectedBy', v.vehicleInspectedBy);
    fd.append('dateOfInspection', v.dateOfInspection);
    fd.append('inspectionLocation', v.inspectionLocation);
    fd.append('vehicleMoved', v.vehicleMoved ? 'true' : 'false');
    fd.append('engineStarted', v.engineStarted ? 'true' : 'false');
    fd.append('odometer', v.odometer.toString());
    fd.append('vinPlate', v.vinPlate ? 'true' : 'false');
    fd.append('bodyType', v.bodyType);
    fd.append('overallTyreCondition', v.overallTyreCondition);
    fd.append('otherAccessoryFitment', v.otherAccessoryFitment ? 'true' : 'false');
    fd.append('windshieldGlass', v.windshieldGlass);
    fd.append('roadWorthyCondition', v.roadWorthyCondition ? 'true' : 'false');
    fd.append('engineCondition', v.engineCondition);
    fd.append('suspensionSystem', v.suspensionSystem);
    fd.append('steeringAssy', v.steeringAssy);
    fd.append('brakeSystem', v.brakeSystem);
    fd.append('chassisCondition', v.chassisCondition);
    fd.append('bodyCondition', v.bodyCondition);
    fd.append('batteryCondition', v.batteryCondition);
    fd.append('paintWork', v.paintWork);
    fd.append('clutchSystem', v.clutchSystem);
    fd.append('gearBoxAssy', v.gearBoxAssy);
    fd.append('propellerShaft', v.propellerShaft);
    fd.append('differentialAssy', v.differentialAssy);
    fd.append('cabin', v.cabin);
    fd.append('dashboard', v.dashboard);
    fd.append('seats', v.seats);
    fd.append('headLamps', v.headLamps);
    fd.append('electricAssembly', v.electricAssembly);
    fd.append('radiator', v.radiator);
    fd.append('intercooler', v.intercooler);
    fd.append('allHosePipes', v.allHosePipes);

    // Append new photo files
    this.photoFiles.forEach((file, index) => {
      fd.append('photos', file, file.name);
    });

    // Include route identifiers
    fd.append('valuationId', this.valuationId);
    fd.append('vehicleNumber', this.vehicleNumber);
    fd.append('applicantContact', this.applicantContact);

    return fd;
  }

  onClick() {
    // Handle the click event for the upload button
    this.router.navigate(['/valuation', this.valuationId, 'inspection','vehicle-image-upload'], {
      queryParams: {
        vehicleNumber: this.vehicleNumber,
        applicantContact: this.applicantContact
      }
    });
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
      )
      .subscribe({
        next: () => {
          this.saveInProgress = false;
          this.saving = false;
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
      )
      .subscribe({
      next: () => {
        // After submit, navigate back to the inspection view
        this.router.navigate(['/valuation', this.valuationId, 'inspection'], {
        queryParams: {
          vehicleNumber: this.vehicleNumber,
          applicantContact: this.applicantContact
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
        applicantContact: this.applicantContact
      }
    });
  }
}

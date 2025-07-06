// src/app/valuation-quality-control/quality-control-update.component.ts

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { QualityControlService } from '../../../services/quality-control.service'; // Adjust path as needed
import { QualityControl } from '../../../models/QualityControl';                   // Adjust path as needed
import { MatSnackBar } from '@angular/material/snack-bar';
import { switchMap } from 'rxjs/operators';
import { WorkflowService } from '../../../services/workflow.service';               // Adjust path as needed
import { SharedModule } from '../../shared/shared.module/shared.module'; // Adjust path as needed
import { WorkflowButtonsComponent } from '../../workflow-buttons/workflow-buttons.component';


@Component({
  selector: 'app-valuation-quality-control-update',
  standalone: true,
  imports: [SharedModule, WorkflowButtonsComponent],
  templateUrl: './quality-control-update.component.html',
  styleUrls: ['./quality-control-update.component.scss']
})
export class QualityControlUpdateComponent implements OnInit {
  valuationId!: string;
  vehicleNumber!: string;
  applicantContact!: string;
  valuationType!: string;

  form!: FormGroup;
  loading = true;
  error: string | null = null;
  saving = false;
  saveInProgress = false;
  submitInProgress = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private qcService: QualityControlService,
    private workflowSvc: WorkflowService,
    private _snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // 1) Read route param: valuationId
    this.valuationId = this.route.snapshot.paramMap.get('valuationId')!;
    
    // 2) Read query params: vehicleNumber & applicantContact
    this.route.queryParamMap.subscribe(params => {
      const vn = params.get('vehicleNumber');
      const ac = params.get('applicantContact');
      this.valuationType = params.get('valuationType')!;
      if (vn && ac) {
        this.vehicleNumber = vn;
        this.applicantContact = ac;
        this.initForm();
        this.loadQualityControl();
      } else {
        this.loading = false;
        this.error = 'Missing vehicleNumber or applicantContact in query parameters.';
      }
    });
  }

  private initForm() {
    this.form = this.fb.group({
      overallRating: ['', Validators.required],
      valuationAmount: [0, [Validators.required, Validators.min(0)]],
      chassisPunch: ['', Validators.required],
      remarks: ['']
    });
  }

  private loadQualityControl() {
    this.loading = true;
    this.error = null;

    this.qcService
      .getQualityControlDetails(this.valuationId, this.vehicleNumber, this.applicantContact)
      .subscribe({
        next: (data: QualityControl) => {
          this.patchForm(data);
          this.loading = false;
        },
        error: (err) => {
          this.error = err.message || 'Failed to load quality control details.';
          this.loading = false;
        }
      });
  }

  private patchForm(data: QualityControl) {
    this.form.patchValue({
      overallRating: data.overallRating,
      valuationAmount: data.valuationAmount,
      chassisPunch: data.chassisPunch,
      remarks: data.remarks || ''
    });
  }

  private buildPayload(): Partial<QualityControl> {
    const v = this.form.getRawValue();
    return {
      overallRating: v.overallRating,
      valuationAmount: v.valuationAmount,
      chassisPunch: v.chassisPunch,
      remarks: v.remarks || null
    };
  }

  onSave() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.saveInProgress = true;

    const payload = this.buildPayload();
    this.qcService
      .updateQualityControlDetails(
        this.valuationId,
        this.vehicleNumber,
        this.applicantContact,
        payload
      )
      .pipe(
        // After successful update, start the next workflow step if needed
        switchMap(() =>
          this.workflowSvc.startWorkflow(
            this.valuationId,
            4, // example workflow step id
            this.vehicleNumber,
            encodeURIComponent(this.applicantContact)
            )
          )
          )
          .subscribe({
          next: () => {
          this.saveInProgress = false;
          this.saving = false;
          this._snackBar.open('Quality control saved successfully', 'Close', {
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

    const payload = this.buildPayload();
    this.qcService
      .updateQualityControlDetails(
        this.valuationId,
        this.vehicleNumber,
        encodeURIComponent(this.applicantContact),
        payload
      )
      .pipe(
        // Complete current workflow step
        switchMap(() =>
          this.workflowSvc.completeWorkflow(
            this.valuationId,
            4, // same step id as above
            this.vehicleNumber,
            encodeURIComponent(this.applicantContact)
          )
        ),
        // Optionally start next step
        switchMap(() =>
          this.workflowSvc.startWorkflow(
            this.valuationId,
            5, // next workflow step
            this.vehicleNumber,
            encodeURIComponent(this.applicantContact)
          )
        )
      )
      .subscribe({
        next: () => {
          // After submit, navigate back to QC view
          this.router.navigate(['/valuation', this.valuationId, 'quality-control'], {
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
    this.router.navigate(['/valuation', this.valuationId, 'quality-control'], {
      queryParams: {
        vehicleNumber: this.vehicleNumber,
        applicantContact: this.applicantContact,
        valuationType: this.valuationType
      }
    });
  }
}

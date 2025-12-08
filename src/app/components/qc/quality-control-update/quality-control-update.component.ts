// src/app/valuation-quality-control/quality-control-update.component.ts

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { QualityControlService } from '../../../services/quality-control.service';
import { QualityControl } from '../../../models/QualityControl';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WorkflowService } from '../../../services/workflow.service';
import { SharedModule } from '../../shared/shared.module/shared.module';
import { WorkflowButtonsComponent } from '../../workflow-buttons/workflow-buttons.component';
import { Auth, User, authState } from '@angular/fire/auth';
import { switchMap, map, take } from 'rxjs/operators';
import { of, Observable, Subscription } from 'rxjs';
import { UsersService } from '../../../services/users.service';
import { ValuationService } from '../../../services/valuation.service';

// ✅ IMPORT HISTORY LOGGER SERVICE
import { HistoryLoggerService } from '../../../services/history-logger.service';


@Component({
  selector: 'app-valuation-quality-control-update',
  standalone: true,
  imports: [SharedModule, WorkflowButtonsComponent],
  templateUrl: './quality-control-update.component.html',
  styleUrls: ['./quality-control-update.component.scss']
})
export class QualityControlUpdateComponent implements OnInit, OnDestroy {
  valuationId!: string;
  vehicleNumber!: string;
  applicantContact!: string;
  valuationType!: string;

  private assignedTo = '';
  private assignedToPhoneNumber = '';
  private assignedToEmail = '';
  private assignedToWhatsapp = '';

  // ✅ ADD THESE FOR TRACKING
  private currentUser: User | null = null;
  private currentUserId: string = 'unknown';
  private currentUserName: string = 'Unknown User';
  private originalFormData: any = {};

  form!: FormGroup;
  loading = true;
  error: string | null = null;
  saving = false;
  saveInProgress = false;
  submitInProgress = false;
  saved = false;

  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private qcService: QualityControlService,
    private workflowSvc: WorkflowService,
    private _snackBar: MatSnackBar,
    private usersSvc: UsersService,
    private valuationSvc: ValuationService,
    private auth: Auth,
    private historyLogger: HistoryLoggerService  // ✅ INJECT
  ) {}

  ngOnInit(): void {
    this.valuationId = this.route.snapshot.paramMap.get('valuationId')!;
    
    // ✅ GET CURRENT USER INFO
    authState(this.auth).pipe(take(1)).subscribe(u => {
      this.currentUser = u;
      if (u) {
        this.currentUserId = u.uid || u.phoneNumber || 'unknown';
        this.resolveDisplayName(u).pipe(take(1)).subscribe(name => {
          this.currentUserName = name || u.email?.split('@')[0] || 'Unknown User';
          this.applyAssignedFromUser(u);
        });
      } else {
        this.applyAssignedFromUser(u);
      }
    });

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

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
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
          // ✅ STORE ORIGINAL DATA
          this.originalFormData = JSON.parse(JSON.stringify(this.form.getRawValue()));
          this.loading = false;
        },
        error: (err) => {
          this.error = err.message || 'Failed to load quality control details.';
          this.loading = false;
        }
      });
  }

  private resolveDisplayName(u: User | null): Observable<string> {
    return of(u).pipe(
      switchMap(user => {
        if (!user) return of('');
        const id = this.resolveId(user);
        if (!id) return of(this.fallbackName(user));
        return this.usersSvc.getById(id).pipe(
          map(m => (m?.name?.trim() || this.fallbackName(user)))
        );
      })
    );
  }

  private resolveId(u: User): string | null {
    return u.phoneNumber ?? u.uid ?? u.email ?? null;
  }

  private fallbackName(u: User): string {
    return u.displayName || u.email || u.phoneNumber || '';
  }

  private applyAssignedFromUser(u: User | null): void {
    this.resolveDisplayName(u).pipe(take(1)).subscribe(name => {
      const safeName =
        (name?.trim() || '') ||
        (u?.email ? u.email.split('@')[0] : '') ||
        (u?.phoneNumber || '') ||
        'User';

      this.assignedTo = safeName;
      this.assignedToPhoneNumber = u?.phoneNumber || '';
      this.assignedToEmail = u?.email || '';
      this.assignedToWhatsapp = u?.phoneNumber || '';
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

  private buildPayload(): Partial<QualityControl> {
    const v = this.form.getRawValue();
    const payload: Partial<QualityControl> = {
      overallRating: v.overallRating,
      valuationAmount: v.valuationAmount,
      chassisPunch: v.chassisPunch,
      remarks: v.remarks || null,
      assignedTo: this.assignedTo,
      assignedToPhoneNumber: this.assignedToPhoneNumber,
      assignedToEmail: this.assignedToEmail,
      assignedToWhatsapp: this.assignedToWhatsapp
    };
    return payload;
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

  onSave() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.saveInProgress = true;

    const payload = this.buildPayload();
    const changedFields = this.getChangedFields();
    const changedFieldsStr = changedFields.map(f => f.fieldName).join(', ');

    this.qcService
      .updateQualityControlDetails(
        this.valuationId,
        this.vehicleNumber,
        this.applicantContact,
        payload
      )
      .pipe(
        switchMap(() =>
          this.workflowSvc.startWorkflow(
            this.valuationId,
            4,
            this.vehicleNumber,
            encodeURIComponent(this.applicantContact)
          )
        ),
        switchMap(() =>
          this.workflowSvc.updateWorkflowTable(
            this.valuationId,
            this.vehicleNumber,
            this.applicantContact,
            {
              workflow: 'QC',
              workflowStepOrder: 4,
              assignedTo: this.assignedTo,
              assignedToPhoneNumber: this.assignedToPhoneNumber,
              assignedToEmail: this.assignedToEmail,
              assignedToWhatsapp: this.assignedToWhatsapp,
              qualityControlAssignedTo: this.assignedTo,
              qualityControlAssignedToPhoneNumber: this.assignedToPhoneNumber,
              qualityControlAssignedToEmail: this.assignedToEmail,
              qualityControlAssignedToWhatsapp: this.assignedToWhatsapp
            }
          )
        ),
        switchMap(() =>
          this.qcService.assignQualityControl(
            this.valuationId,
            this.vehicleNumber,
            this.applicantContact,
            this.assignedTo,
            this.assignedToPhoneNumber,
            this.assignedToEmail,
            this.assignedToWhatsapp
          )
        ),
        switchMap(() =>
          this.valuationSvc.assignValuation(
            this.valuationId,
            this.vehicleNumber,
            this.applicantContact,
            this.assignedTo,
            this.assignedToPhoneNumber,
            this.assignedToEmail,
            this.assignedToWhatsapp
          )
        ),
        // ✅ LOG HISTORY
        switchMap(() =>
          this.logHistoryAction(
            'Quality Control Details Saved',
            `${changedFields.length} field(s) updated: ${changedFieldsStr}`,
            null,
            'QC'
          )
        )
      )
      .subscribe({
        next: () => {
          this.saveInProgress = false;
          this.saving = false;
          this.saved = true;
          this._snackBar.open('✅ Quality control saved successfully and history logged', 'Close', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
          // ✅ UPDATE ORIGINAL DATA AFTER SAVE
          this.originalFormData = JSON.parse(JSON.stringify(this.form.getRawValue()));
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
    const changedFields = this.getChangedFields();
    const changedFieldsStr = changedFields.map(f => f.fieldName).join(', ');

    this.qcService
      .updateQualityControlDetails(
        this.valuationId,
        this.vehicleNumber,
        encodeURIComponent(this.applicantContact),
        payload
      )
      .pipe(
        switchMap(() =>
          this.workflowSvc.completeWorkflow(
            this.valuationId,
            4,
            this.vehicleNumber,
            encodeURIComponent(this.applicantContact)
          )
        ),
        switchMap(() =>
          this.workflowSvc.startWorkflow(
            this.valuationId,
            5,
            this.vehicleNumber,
            encodeURIComponent(this.applicantContact)
          )
        ),
        switchMap(() =>
          this.workflowSvc.updateWorkflowTable(
            this.valuationId,
            this.vehicleNumber,
            this.applicantContact,
            {
              workflow: 'FinalReport',
              workflowStepOrder: 5,
              assignedTo: this.assignedTo,
              assignedToPhoneNumber: this.assignedToPhoneNumber,
              assignedToEmail: this.assignedToEmail,
              assignedToWhatsapp: this.assignedToWhatsapp,
              qualityControlAssignedTo: this.assignedTo,
              qualityControlAssignedToPhoneNumber: this.assignedToPhoneNumber,
              qualityControlAssignedToEmail: this.assignedToEmail,
              qualityControlAssignedToWhatsapp: this.assignedToWhatsapp
            }
          )
        ),
        switchMap(() =>
          this.valuationSvc.assignValuation(
            this.valuationId,
            this.vehicleNumber,
            this.applicantContact,
            this.assignedTo,
            this.assignedToPhoneNumber,
            this.assignedToEmail,
            this.assignedToWhatsapp
          )
        ),
        switchMap(() =>
          this.qcService.assignQualityControl(
            this.valuationId,
            this.vehicleNumber,
            this.applicantContact,
            this.assignedTo,
            this.assignedToPhoneNumber,
            this.assignedToEmail,
            this.assignedToWhatsapp
          )
        ),
        // ✅ LOG HISTORY
        switchMap(() =>
          this.logHistoryAction(
            'Quality Control Submitted - Moving to Final Report',
            `Quality control completed. ${changedFields.length} field(s) updated: ${changedFieldsStr}. Overall Rating: ${this.form.get('overallRating')?.value}, Valuation Amount: ₹${this.form.get('valuationAmount')?.value}. Status: QC Complete → Final Report In Progress`,
            'QC',
            'FinalReport'
          )
        )
      )
      .subscribe({
        next: () => {
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

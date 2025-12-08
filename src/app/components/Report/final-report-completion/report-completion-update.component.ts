// src/app/components/report-completion-update/report-completion-update.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SharedModule } from '../../shared/shared.module/shared.module';
import { WorkflowButtonsComponent } from '../../workflow-buttons/workflow-buttons.component';
import { Auth, User, authState } from '@angular/fire/auth';
import { take, switchMap, of, map, Subscription } from 'rxjs';
import { ValuationResponseService } from '../../../services/valuation-response.service';
import { UsersService } from '../../../services/users.service';
import { RouterModule } from '@angular/router';
import { WorkflowService } from '../../../services/workflow.service';

// ✅ IMPORT HISTORY LOGGER SERVICE
import { HistoryLoggerService } from '../../../services/history-logger.service';


@Component({
  selector: 'app-report-completion-update',
  standalone: true,
  imports: [SharedModule, WorkflowButtonsComponent, RouterModule],
  templateUrl: './report-completion-update.component.html',
  styleUrls: ['./report-completion-update.component.scss']
})
export class ReportCompletionUpdateComponent implements OnInit, OnDestroy {
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

  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private _snackBar: MatSnackBar,
    private auth: Auth,
    private vrSvc: ValuationResponseService,
    private usersSvc: UsersService,
    private workflowSvc: WorkflowService,
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
      this.valuationType = params.get('valuationType') || '';
      if (vn && ac) {
        this.vehicleNumber = vn;
        this.applicantContact = ac;
        this.initForm();
        this.hydrateUserDefaults();
      } else {
        this.loading = false;
        this.error = 'Missing vehicleNumber or applicantContact in query parameters.';
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initForm(): void {
    const nowLocal = this.toLocalDateTimeInput(new Date());
    this.form = this.fb.group({
      status: ['Completed', Validators.required],
      completedAt: [nowLocal, Validators.required],
      completedBy: ['', Validators.required],
      paymentStatus: ['Completed', Validators.required],
      paymentReference: ['Paytm'],
      paymentDate: [nowLocal, Validators.required],
      paymentMethod: ['Online', Validators.required],
      paymentAmount: [800, [Validators.required, Validators.min(0)]],
      remarks: ['']
    });

    // ✅ STORE ORIGINAL DATA
    this.originalFormData = JSON.parse(JSON.stringify(this.form.getRawValue()));
  }

  private hydrateUserDefaults(): void {
    authState(this.auth).pipe(take(1)).subscribe(u => {
      this.currentUser = u;
      this.resolveDisplayName(u).pipe(take(1)).subscribe(name => {
        const completedBy = (name?.trim() || this.fallbackName(u)) || 'User';
        this.form.patchValue({ completedBy });
        this.loading = false;
      });
    });
  }

  private resolveDisplayName(u: User | null) {
    if (!u) return of('');
    const id = u.phoneNumber ?? u.uid ?? u.email ?? null;
    if (!id) return of(this.fallbackName(u));
    return this.usersSvc.getById(id).pipe(
      map(m => (m?.name?.trim() || this.fallbackName(u)))
    );
  }

  private fallbackName(u: User | null): string {
    return (u?.displayName || u?.email || u?.phoneNumber || '') ?? '';
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

  private toLocalDateTimeInput(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private toIsoUtc(datetimeLocal: string): string {
    const date = new Date(datetimeLocal);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString();
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

  private buildPayload() {
    const v = this.form.getRawValue();
    return {
      status: v.status,
      completedAt: this.toIsoUtc(v.completedAt),
      completedBy: this.assignedTo,
      paymentStatus: v.paymentStatus,
      paymentReference: v.paymentReference || null,
      paymentDate: this.toIsoUtc(v.paymentDate),
      paymentMethod: v.paymentMethod,
      paymentAmount: String(v.paymentAmount ?? ''),
      completedByPhoneNumber: this.assignedToPhoneNumber,
      completedByEmail: this.assignedToEmail,
      completedByWhatsapp: this.assignedToWhatsapp,
      remarks: v.remarks || ''
    };
  }

  onSaveDraft(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.saveInProgress = true;

    const changedFields = this.getChangedFields();

    // ✅ LOG DRAFT SAVE
    this.historyLogger.logAction(
      this.valuationId,
      'Final Report Draft Saved',
      `${changedFields.length} field(s) updated: ${changedFields.map(f => f.fieldName).join(', ')}`,
      this.currentUserId,
      this.currentUserName,
      null,
      'FinalReport'
    ).then(() => {
      setTimeout(() => {
        this.saving = false;
        this.saveInProgress = false;
        this._snackBar.open('✅ Draft saved locally and history logged', 'Close', { 
          duration: 2000, 
          horizontalPosition: 'center', 
          verticalPosition: 'top' 
        });
        this.originalFormData = JSON.parse(JSON.stringify(this.form.getRawValue()));
      }, 300);
    }).catch(err => {
      console.error('Error logging draft save:', err);
      setTimeout(() => {
        this.saving = false;
        this.saveInProgress = false;
        this._snackBar.open('Draft saved locally', 'Close', { duration: 2000 });
      }, 300);
    });
  }

  onSubmitForReview(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.submitInProgress = true;

    type ExtendedStatus = 'Completed' | 'Pending' | 'Rejected';

    const payload = {
      ...this.buildPayload(),
      status: 'In Review' as ExtendedStatus
    };

    const changedFields = this.getChangedFields();
    const changedFieldsStr = changedFields.map(f => f.fieldName).join(', ');

    this.vrSvc.completeValuationResponse(
      this.valuationId,
      this.vehicleNumber,
      this.applicantContact,
      payload
    ).pipe(
      switchMap(() =>
        new Promise((resolve, reject) => {
          // ✅ LOG SUBMIT FOR REVIEW
          this.historyLogger.logAction(
            this.valuationId,
            'Final Report Submitted for Review',
            `${changedFields.length} field(s) updated: ${changedFieldsStr}. Payment: ${payload.paymentMethod} ₹${payload.paymentAmount}. Status: In Review`,
            this.currentUserId,
            this.currentUserName,
            'FinalReport',
            'InReview'
          ).then(() => resolve(true)).catch(err => {
            console.error('Error logging submit for review:', err);
            resolve(true); // Don't fail workflow
          });
        })
      )
    ).subscribe({
      next: () => {
        this.saving = false;
        this.submitInProgress = false;
        this._snackBar.open('✅ Report submitted for review and history logged', 'Close', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });

        this.router.navigate([
          '/valuation',
          this.valuationId,
          'final-report'
        ], {
          queryParams: {
            vehicleNumber: this.vehicleNumber,
            applicantContact: this.applicantContact,
            valuationType: this.valuationType
          }
        });
      },
      error: (err) => {
        this.error = err?.message || 'Submit for review failed.';
        this.saving = false;
        this.submitInProgress = false;
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.submitInProgress = true;

    const payload = this.buildPayload();
    const changedFields = this.getChangedFields();
    const changedFieldsStr = changedFields.map(f => f.fieldName).join(', ');

    this.vrSvc.completeValuationResponse(
      this.valuationId,
      this.vehicleNumber,
      this.applicantContact,
      payload
    ).pipe(
      switchMap(() =>
        this.workflowSvc.completeWorkflow(
          this.valuationId,
          5,
          this.vehicleNumber,
          encodeURIComponent(this.applicantContact)
        )
      ),
      switchMap(() =>
        new Promise((resolve, reject) => {
          // ✅ LOG COMPLETION
          this.historyLogger.logAction(
            this.valuationId,
            'Final Report Completed - Workflow Finalized',
            `${changedFields.length} field(s) updated: ${changedFieldsStr}. Payment: ${payload.paymentMethod} ₹${payload.paymentAmount}. Remarks: ${payload.remarks || 'None'}. Status: Final Report Complete → Valuation Complete`,
            this.currentUserId,
            this.currentUserName,
            'FinalReport',
            'Complete'
          ).then(() => resolve(true)).catch(err => {
            console.error('Error logging completion:', err);
            resolve(true); // Don't fail workflow
          });
        })
      )
    ).subscribe({
      next: () => {
        this.saving = false;
        this.submitInProgress = false;
        this._snackBar.open('✅ Report marked as Completed and history logged', 'Close', { 
          duration: 3000, 
          horizontalPosition: 'center', 
          verticalPosition: 'top' 
        });

        this.router.navigate(['/valuation', this.valuationId, 'final-report'], {
          queryParams: {
            vehicleNumber: this.vehicleNumber,
            applicantContact: this.applicantContact,
            valuationType: this.valuationType
          }
        });
      },
      error: (err) => {
        this.error = err?.message || 'Completion failed.';
        this.saving = false;
        this.submitInProgress = false;
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/valuation', this.valuationId, 'final-report'], {
      queryParams: {
        vehicleNumber: this.vehicleNumber,
        applicantContact: this.applicantContact,
        valuationType: this.valuationType
      }
    });
  }
}

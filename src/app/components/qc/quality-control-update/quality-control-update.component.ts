// src/app/valuation-quality-control/quality-control-update.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Auth, User, authState } from '@angular/fire/auth';
import { switchMap, map, take, catchError } from 'rxjs/operators';
import { forkJoin, of, Observable, Subscription } from 'rxjs';

// Services
import { QualityControlService } from '../../../services/quality-control.service';
import { WorkflowService } from '../../../services/workflow.service';
import { UsersService } from '../../../services/users.service';
import { ValuationService } from '../../../services/valuation.service';
import { HistoryLoggerService } from '../../../services/history-logger.service';

// Models
import { QualityControl } from '../../../models/QualityControl';
import { FinalReport, PhotoUrls } from '../../../models/final-report.model';

// Components
import { SharedModule } from '../../shared/shared.module/shared.module';
import { WorkflowButtonsComponent } from '../../workflow-buttons/workflow-buttons.component';

@Component({
  selector: 'app-valuation-quality-control-update',
  standalone: true,
  imports: [SharedModule, WorkflowButtonsComponent, CommonModule, FormsModule],
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

  // Tracking User Info
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

  // Checklist state
  cl: Record<string, string | null> = {};
  clRemarks: Record<string, string> = { doc: '', acc: '', val: '', rec: '' };
  report!: FinalReport;
  photoKeys: (keyof PhotoUrls)[] = [];

  setCl(key: string, val: string): void {
    this.cl[key] = this.cl[key] === val ? null : val;
  }

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
    private historyLogger: HistoryLoggerService
  ) {}

  ngOnInit(): void {
    this.valuationId = this.route.snapshot.paramMap.get('valuationId')!;
    
    // Get Current User Info
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

  // ✅ UPDATED: Initialize Form with Payment Fields
  private initForm() {
    const nowLocal = this.toLocalDateTimeInput(new Date());

    this.form = this.fb.group({
      overallRating: ['', Validators.required],
      valuationAmount: [0, [Validators.required, Validators.min(0)]],
      chassisPunch: [''],
      remarks: [''],

      // Payment Fields
      paymentStatus: ['Pending', Validators.required],
      paymentReference: [''],
      paymentDate: [nowLocal, Validators.required],
      paymentMethod: ['Online', Validators.required],
      paymentAmount: [800, [Validators.required, Validators.min(0)]]
    });
  }

  private prefillChecklist(): void {
    const vd  = this.report?.vehicleDetails;
    const ins = this.report?.inspectionDetails;
    const ve  = this.report?.valuationResponse as any;
    const qcFormVal = this.form.getRawValue();

    const chassisPunch  = (qcFormVal.chassisPunch  || '').toUpperCase().replace(/[-\s]/g, '');
    const overallRating = (qcFormVal.overallRating || '').toUpperCase();
    const engineCond    = (ins?.engineCondition     || '').toUpperCase();
    const tyreCond      = (ins?.overallTyreCondition || '').toUpperCase();
    const exteriorCond  = (ins?.exteriorCondition   || '').toUpperCase();
    const bodyCondition = (ins?.bodyCondition       || '').toUpperCase();
    const valuationAmt  = Number(qcFormVal.valuationAmount ?? 0);
    const low           = Number(ve?.lowRange  ?? ve?.LowRange  ?? 0);
    const high          = Number(ve?.highRange ?? ve?.HighRange ?? 0);

    const condMap = (v: string): string | null =>
      v === 'GOOD' ? 'good' : v === 'AVERAGE' ? 'average' : v === 'POOR' ? 'poor' : null;

    // Document Verification
    if (vd?.registrationNumber) this.cl['docRC'] = 'ok';
    if (chassisPunch === 'ORIGINAL')   this.cl['docChassis'] = 'original';
    else if (chassisPunch === 'REPUNCHED') this.cl['docChassis'] = 'repunched';
    else if (chassisPunch === 'TAMPERED')  this.cl['docChassis'] = 'tampered';

    // Data Accuracy
    if (vd?.registrationNumber)            this.cl['accReg']          = 'pass';
    if (vd?.chassisNumber || ins?.vinPlate) this.cl['accChassis']      = 'pass';
    if ((ins?.odometer ?? 0) > 0)          this.cl['accOdo']          = 'pass';
    if (vd?.fuel)                          this.cl['accFuel']         = 'pass';
    if (vd?.make && vd?.model)             this.cl['accVahan']        = 'pass';
    if (this.report?.stakeholder?.applicant?.name) this.cl['accOwner'] = 'pass';
    if (vd?.ownerName)                     this.cl['accSerial']       = 'pass';
    if (ins?.vehicleInspectedBy)           this.cl['accMandatory']    = 'pass';
    if (ins?.remarks || ins?.vehicleInspectedBy) this.cl['accRemarks'] = 'pass';

    // Valuation Quality
    const photoCount = this.photoKeys?.length ?? 0;
    if (photoCount >= 8)      this.cl['valMinPhotos'] = 'pass';
    else if (photoCount > 0)  this.cl['valMinPhotos'] = 'fail';
    if (low > 0 && high > 0)
      this.cl['valInRange'] = (valuationAmt >= low && valuationAmt <= high) ? 'pass' : 'fail';
    if (vd?.yearOfMfg && (ins?.odometer ?? 0) > 0) {
      const age = new Date().getFullYear() - vd.yearOfMfg;
      const avgKm = age > 0 ? ins!.odometer / age : 0;
      this.cl['valAgeOdo'] = avgKm < 60000 ? 'pass' : 'fail';
    }
    if (overallRating === 'GOOD') this.cl['valScore'] = 'pass';
    else if (overallRating === 'POOR') this.cl['valScore'] = 'fail';

    // QC Recommendation
    this.cl['recCondition'] = condMap(overallRating);
    this.cl['recEngine']    = condMap(engineCond);
    const extVal = exteriorCond || bodyCondition;
    if (extVal === 'GOOD') this.cl['recExterior'] = 'good';
    else if (extVal === 'AVERAGE' || extVal === 'FAIR') this.cl['recExterior'] = 'minor';
    else if (extVal === 'POOR') this.cl['recExterior'] = 'major';
    if (tyreCond === 'GOOD')     this.cl['recTyre'] = 'good';
    else if (tyreCond === 'AVERAGE') this.cl['recTyre'] = 'average';
    else if (tyreCond === 'POOR')    this.cl['recTyre'] = 'replacement';
    if (chassisPunch === 'TAMPERED' || overallRating === 'POOR') this.cl['recFinal'] = 'not-recommended';
    else if (overallRating === 'GOOD' && chassisPunch === 'ORIGINAL') this.cl['recFinal'] = 'recommended';
    else this.cl['recFinal'] = 'conditional';
  }

  // Load Data
  private loadQualityControl() {
    this.loading = true;
    this.error = null;

    const qc$ = this.qcService.getQualityControlDetails(this.valuationId, this.vehicleNumber, this.applicantContact);
    const report$ = this.valuationSvc.getFinalReport(this.valuationId, this.vehicleNumber, this.applicantContact);

    forkJoin({ qcData: qc$, reportData: report$ }).subscribe({
      next: ({ qcData, reportData }) => {
        this.report = reportData;
        this.photoKeys = Object.keys(reportData.photoUrls || {}) as (keyof PhotoUrls)[];
        this.patchForm(qcData);
        this.prefillChecklist();
        // Load previously saved checklist values (override prefilled)
        if (qcData.qcChecklist) {
          Object.entries(qcData.qcChecklist).forEach(([k, v]) => {
            if (v !== null && v !== undefined) this.cl[k] = v;
          });
        }
        if (qcData.qcChecklistRemarks) {
          Object.entries(qcData.qcChecklistRemarks).forEach(([k, v]) => {
            if (v) this.clRemarks[k] = v;
          });
        }
        this.originalFormData = JSON.parse(JSON.stringify(this.form.getRawValue()));
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to load quality control details.';
        this.loading = false;
      }
    });
  }

  // ✅ UPDATED: Patch Form with Payment Data
  private patchForm(data: QualityControl | any) {
    // Handle date conversion safely
    const existingDate = data.paymentDate 
      ? this.toLocalDateTimeInput(new Date(data.paymentDate)) 
      : this.toLocalDateTimeInput(new Date());

    this.form.patchValue({
      overallRating: data.overallRating,
      valuationAmount: data.valuationAmount,
      chassisPunch: data.chassisPunch,
      remarks: data.remarks || '',
      
      // Payment Fields
      paymentStatus: data.paymentStatus || 'Pending',
      paymentReference: data.paymentReference || '',
      paymentDate: existingDate,
      paymentMethod: data.paymentMethod || 'Online',
      paymentAmount: data.paymentAmount || 800
    });
  }

  // User Resolution Helpers
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

  // Change Tracking
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

  // ✅ UPDATED: Build Payload with Payment Data
  private buildPayload(): Partial<QualityControl> {
    const v = this.form.getRawValue();
    
    // Explicitly casting payload to include new fields if the interface isn't updated yet
    const payload: Partial<QualityControl> | any = {
      overallRating: v.overallRating,
      valuationAmount: v.valuationAmount,
      chassisPunch: v.chassisPunch,
      remarks: v.remarks || null,
      assignedTo: this.assignedTo,
      assignedToPhoneNumber: this.assignedToPhoneNumber,
      assignedToEmail: this.assignedToEmail,
      assignedToWhatsapp: this.assignedToWhatsapp,

      // Payment Data
      paymentStatus: v.paymentStatus,
      paymentReference: v.paymentReference || null,
      paymentDate: this.toIsoUtc(v.paymentDate),
      paymentMethod: v.paymentMethod,
      paymentAmount: v.paymentAmount,

      // Checklist
      qcChecklist: this.cl,
      qcChecklistRemarks: this.clRemarks
    };
    return payload;
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

  // Save Action
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
        // Start Workflow Step 4 (QC)
        switchMap(() =>
          this.workflowSvc.startWorkflow(
            this.valuationId,
            4,
            this.vehicleNumber,
            encodeURIComponent(this.applicantContact)
          ).pipe(catchError(() => of(null)))
        ),
        // Update Workflow Table
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
        // Assign QC
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
        // Assign Valuation
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
        // Log History
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
          // Update original data after save
          this.originalFormData = JSON.parse(JSON.stringify(this.form.getRawValue()));
        },
        error: (err) => {
          this.error = err.message || 'Save failed.';
          this.saveInProgress = false;
          this.saving = false;
        }
      });
  }

  // Submit Action
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
        // Complete QC Workflow (Step 4)
        switchMap(() =>
          this.workflowSvc.completeWorkflow(
            this.valuationId,
            4,
            this.vehicleNumber,
            encodeURIComponent(this.applicantContact)
          )
        ),
        // Start Final Report Workflow (Step 5)
        switchMap(() =>
          this.workflowSvc.startWorkflow(
            this.valuationId,
            5,
            this.vehicleNumber,
            encodeURIComponent(this.applicantContact)
          )
        ),
        // Update Workflow Table for Final Report
        switchMap(() =>
          this.workflowSvc.updateWorkflowTable(
            this.valuationId,
            this.vehicleNumber,
            this.applicantContact,
            {
              workflow: 'FinalReport',
              workflowStepOrder: 5,
              qualityControlAssignedTo: this.assignedTo,
              qualityControlAssignedToPhoneNumber: this.assignedToPhoneNumber,
              qualityControlAssignedToEmail: this.assignedToEmail,
              qualityControlAssignedToWhatsapp: this.assignedToWhatsapp
            }
          )
        ),
        // Assign QC
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
        // Log History
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
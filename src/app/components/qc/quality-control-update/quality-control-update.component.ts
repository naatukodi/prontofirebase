// src/app/valuation-quality-control/quality-control-update.component.ts

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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

// Shared QC verification engine (also used by the QC view page)
import { buildQcChecklist, applySavedChecklist } from '../../../shared/qc-checklist';
import { scoreInspection, scoreBand, ScoreBand, SectionScore } from '../../../shared/inspection-score';

// Components
import { SharedModule } from '../../shared/shared.module/shared.module';
import { WorkflowButtonsComponent } from '../../workflow-buttons/workflow-buttons.component';

// Mirrors the gallery-page slot definitions in ProntoPDFGeneration's
// PdfReportService.ComposePhotoGalleryAndDisclaimer — keep in sync.
const GALLERY_SLOT_DEFS: { label: string; keys: string[] }[] = [
  { label: 'Front View',      keys: ['FrontViewGrille', 'FrontView'] },
  { label: 'Rear View',       keys: ['RearViewTailgate', 'RearView'] },
  { label: 'Front Right',     keys: ['FrontRightSide', 'FrontRight'] },
  { label: 'Front Left',      keys: ['FrontLeftSide', 'FrontLeft'] },
  { label: 'Rear Right',      keys: ['RearRightSide', 'RearRight'] },
  { label: 'Rear Left',       keys: ['RearLeftSide', 'RearLeft'] },
  { label: 'Right Side',      keys: ['DriverSideProfile', 'RightSideView'] },
  { label: 'Left Side',       keys: ['PassengerSideProfile', 'LeftSideView'] },
  { label: 'Odo Meter',       keys: ['Odometer', 'OdoMeter', 'InstrumentCluster'] },
  { label: 'Engine Bay',      keys: ['EngineBay', 'Engine'] },
  { label: 'Dashboard',       keys: ['Dashboard', 'DashboardCloseup'] },
  { label: 'Selfie',          keys: ['SelfieWithVehicle', 'Selfie'] },
  { label: 'Chassis Number',  keys: ['ChassisNumberPlate', 'ChassisNumber', 'Chassis', 'ChassisImprint'] },
  { label: 'VIN Plate',       keys: ['VinPlate', 'VIN'] },
  { label: 'Tyre - Front Left',  keys: ['TireFrontLeft'] },
  { label: 'Tyre - Front Right', keys: ['TireFrontRight'] },
  { label: 'Tyre - Rear Left',   keys: ['TireRearLeft'] },
  { label: 'Tyre - Rear Right',  keys: ['TireRearRight'] },
];

interface GallerySlot {
  label: string;
  key: string;
  url: string;
  selected: boolean;
}

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
  // What the system compared to reach each pre-filled verdict, shown under the card.
  clWhy: Record<string, string> = {};
  clRemarks: Record<string, string> = { doc: '', acc: '', val: '', rec: '' };
  report!: FinalReport;
  photoKeys: (keyof PhotoUrls)[] = [];

  // ── Section scores, carried over from the AVO inspection ──
  sectionScores: SectionScore[] = [];
  overallScore: number | null = null;

  band(score: number | null): ScoreBand | null {
    return scoreBand(score);
  }

  /** Gallery page photo selection */
  gallerySlots: GallerySlot[] = [];

  // ── AI photo audit ──────────────────────────────────────────────────────
  aiRunning = false;
  aiError: string | null = null;
  /** Keys this run actually verified, so the UI can mark them as machine-read. */
  aiVerified = new Set<string>();
  aiReadAt: string | null = null;
  /** Keys carrying a verdict the reviewer already saved — never overwritten. */
  private savedByReviewer = new Set<string>();

  /**
   * Reads the case photos and folds the findings into the checklist.
   *
   * Run on demand rather than on page load: it costs money per call, and a
   * reviewer reopening a case should not spend it again for no reason.
   *
   * A key the audit could not verify is left alone rather than being cleared —
   * and the reviewer's own selections are never overwritten, because a human
   * verdict outranks a machine one.
   */
  runAiPhotoAudit(force = false): void {
    if (this.aiRunning) return;
    this.aiRunning = true;
    this.aiError = null;
    this.cdr.detectChanges();

    this.qcService
      .runAiPhotoAudit(this.valuationId, this.vehicleNumber, this.applicantContact, force)
      .subscribe({
        next: (audit) => {
          this.aiRunning = false;
          this.aiReadAt = audit.readAt || null;

          if (audit.error) {
            this.aiError = audit.error;
            this.cdr.detectChanges();
            return;
          }

          // Notes first: even an unresolved check gains a better explanation than
          // "confirm it by eye" once the photos have actually been looked at.
          Object.entries(audit.why || {}).forEach(([k, v]) => {
            if (v && !this.savedByReviewer.has(k)) this.clWhy[k] = v;
          });

          Object.entries(audit.cl || {}).forEach(([k, v]) => {
            // A verdict the reviewer saved outranks the machine's, and this arrives
            // after the page has loaded — so it must never win by being late.
            if (!v || this.savedByReviewer.has(k)) return;
            this.cl[k] = v;
            this.aiVerified.add(k);
          });

          this.cdr.detectChanges();
        },
        error: (err) => {
          this.aiRunning = false;
          this.aiError = err?.error?.message || 'Could not reach the photo reader.';
          this.cdr.detectChanges();
        }
      });
  }

  /** True while this card's verdict is the one the photo reader produced. */
  isAi(key: string): boolean {
    return this.aiVerified.has(key);
  }

  setCl(key: string, val: string): void {
    // A manual choice replaces the machine's, so drop the "read from photos" mark.
    this.aiVerified.delete(key);
    this.cl[key] = this.cl[key] === val ? null : val;
    this.clWhy[key] = this.cl[key] === null
      ? 'Cleared by ' + this.currentUserName + '.'
      : 'Set manually by ' + this.currentUserName + ' — overrides the automatic check.';

    // The reading now starts when AVO submits, so it can land half a minute after
    // this page opened — long after the reviewer began working. Without this, a
    // verdict decided here would be silently overwritten when it arrives. Marking
    // the key protects a choice made seconds ago exactly as one saved last week.
    this.savedByReviewer.add(key);
  }

  toggleGallerySlot(slot: GallerySlot): void {
    slot.selected = !slot.selected;
  }

  /** "FrontLeftSide" → "Front Left Side" — used for photos with no gallery slot. */
  private static humanisePhotoKey(key: string): string {
    return key
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private buildGallerySlots(photoUrls: PhotoUrls, savedSelection: string[]): GallerySlot[] {
    const slots: GallerySlot[] = [];
    const used = new Set<string>();

    const add = (key: string, label: string) => {
      const url = (photoUrls as any)?.[key];
      if (!url || used.has(key)) return;
      used.add(key);
      slots.push({
        label,
        key,
        url,
        selected: savedSelection.length === 0 || savedSelection.includes(key)
      });
    };

    // Named gallery slots first, so the familiar report order is preserved.
    for (const def of GALLERY_SLOT_DEFS) {
      const resolvedKey = def.keys.find(k => !!(photoUrls as any)?.[k]);
      if (resolvedKey) add(resolvedKey, def.label);
    }

    // Then everything else that was uploaded — a photo with no named slot (an
    // alternate for a slot already filled, or a type the gallery never listed)
    // was previously impossible to pick for the report.
    for (const key of Object.keys(photoUrls || {})) {
      add(key, QualityControlUpdateComponent.humanisePhotoKey(key));
    }

    return slots;
  }

  private getGallerySelectionToSave(): string[] {
    if (this.gallerySlots.length === 0) return [];
    // If everything is checked, save an empty list so it behaves as "standard" —
    // future photos added later stay included automatically.
    if (this.gallerySlots.every(s => s.selected)) return [];
    return this.gallerySlots.filter(s => s.selected).map(s => s.key);
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
    private historyLogger: HistoryLoggerService,
    // The app is zoneless: state set after an async call is not an event-listener
    // turn, so it needs an explicit nudge to reach the view.
    private cdr: ChangeDetectorRef
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

  private initForm() {
    this.form = this.fb.group({
      overallRating: ['', Validators.required],
      valuationAmount: [0, [Validators.required, Validators.min(0)]],
      chassisPunch: [''],
      remarks: ['']
    });
  }

  /**
   * Pre-fills every checklist card from the earlier workflow steps and records what
   * each verdict was based on. The rules live in shared/qc-checklist.ts so the QC
   * view page shows exactly the same verdicts and notes.
   */
  private prefillChecklist(): void {
    const v  = this.form.getRawValue();
    const ve = this.report?.valuationResponse as any;

    const result = buildQcChecklist({
      report: this.report,
      overallRating: v.overallRating,
      chassisPunch: v.chassisPunch,
      valuationAmount: v.valuationAmount,
      lowRange:  ve?.lowRange  ?? ve?.LowRange,
      highRange: ve?.highRange ?? ve?.HighRange,
      photoKeys: this.photoKeys as string[],
      vehicleSegment: this.report?.stakeholder?.vehicleSegment,
      valuationType: this.valuationType
    });

    this.cl = result.cl;
    this.clWhy = result.why;
  }

  // Load Data
  private loadQualityControl() {
    this.loading = true;
    this.error = null;

    const qc$ = this.qcService.getQualityControlDetails(this.valuationId, this.vehicleNumber, this.applicantContact);
    const report$ = this.valuationSvc.getFinalReport(this.valuationId, this.vehicleNumber, this.applicantContact);
    const gallerySelection$ = this.valuationSvc.getGalleryPhotoSelection(this.valuationId, this.vehicleNumber, this.applicantContact);

    forkJoin({ qcData: qc$, reportData: report$, gallerySelection: gallerySelection$ }).subscribe({
      next: ({ qcData, reportData, gallerySelection }) => {
        this.report = reportData;
        this.photoKeys = Object.keys(reportData.photoUrls || {}) as (keyof PhotoUrls)[];
        this.gallerySlots = this.buildGallerySlots(reportData.photoUrls, gallerySelection || []);

        // Overall score is the mean of the AVO's section scores — the same
        // figure the AVO page shows and the report's cover gauge prints.
        const scored = scoreInspection(
          reportData.stakeholder?.vehicleSegment,
          reportData.inspectionDetails as unknown as Record<string, unknown>,
          this.valuationType
        );
        this.sectionScores = scored.sections;
        this.overallScore = scored.overall;
        this.patchForm(qcData);

        // Overall Rating is the derived score. Written after patchForm so it
        // replaces whatever was saved before, and locked so the two can never
        // disagree — the checklist and the printed report both read this field.
        if (this.overallScore !== null) {
          this.form.patchValue({ overallRating: this.overallScore.toFixed(1) });
          this.form.get('overallRating')?.disable({ emitEvent: false });
        } else {
          // Nothing scored yet — leave it typeable so the case is not stuck.
          this.form.get('overallRating')?.enable({ emitEvent: false });
        }

        this.prefillChecklist();
        applySavedChecklist({ cl: this.cl, why: this.clWhy }, qcData.qcChecklist);
        if (qcData.qcChecklistRemarks) {
          Object.entries(qcData.qcChecklistRemarks).forEach(([k, v]) => {
            if (v) this.clRemarks[k] = v;
          });
        }
        // Anything the reviewer already saved is theirs. The reading lands after this
        // point, so remember these keys now — otherwise it would quietly overwrite a
        // decision a person made and saved. Added rather than assigned, so the set
        // only ever grows: setCl puts this session's choices in it too, and a reload
        // of the case data must not drop them.
        Object.entries(qcData.qcChecklist || {})
          .filter(([, v]) => v !== null && v !== undefined)
          .forEach(([k]) => this.savedByReviewer.add(k));

        this.originalFormData = JSON.parse(JSON.stringify(this.form.getRawValue()));
        this.loading = false;

        // Reads the photos without being asked. The backend keeps the answer against
        // this photo set, so only the first open of a case actually spends anything.
        this.runAiPhotoAudit();
      },
      error: (err) => {
        this.error = err.message || 'Failed to load quality control details.';
        this.loading = false;
      }
    });
  }

  private patchForm(data: QualityControl | any) {
    this.form.patchValue({
      overallRating: data.overallRating,
      valuationAmount: data.valuationAmount,
      chassisPunch: data.chassisPunch,
      remarks: data.remarks || ''
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
        // Save gallery photo selection
        switchMap(() =>
          this.valuationSvc.updateGalleryPhotoSelection(
            this.valuationId,
            this.vehicleNumber,
            this.applicantContact,
            this.getGallerySelectionToSave()
          ).pipe(catchError(() => of(null)))
        ),
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
        // Save gallery photo selection
        switchMap(() =>
          this.valuationSvc.updateGalleryPhotoSelection(
            this.valuationId,
            this.vehicleNumber,
            this.applicantContact,
            this.getGallerySelectionToSave()
          ).pipe(catchError(() => of(null)))
        ),
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
          // The case has moved to Final Report — follow it rather than staying here.
          this.router.navigate(['/valuation', this.valuationId, 'final-report'], {
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
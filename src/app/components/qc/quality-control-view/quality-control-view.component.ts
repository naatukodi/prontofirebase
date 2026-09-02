// src/app/components/qc/quality-control-view/quality-control-view.component.ts

import { Component, OnInit, inject, HostListener, ChangeDetectorRef } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Services
import { QualityControlService } from '../../../services/quality-control.service';
import { ValuationService } from '../../../services/valuation.service';
import { AuthorizationService } from '../../../services/authorization.service';
import { WorkflowService } from '../../../services/workflow.service'; 
import { UsersService } from '../../../services/users.service';         

// Models
import { QualityControlViewModel } from '../../../models/QualityControlViewModel';
import { FinalReport, PhotoUrls } from '../../../models/final-report.model';
import { environment } from '../../../../environments/environment';

// Shared QC verification engine (also used by the QC update page)
import { buildQcChecklist, applySavedChecklist } from '../../../shared/qc-checklist';
import { scoreInspection, scoreBand, ScoreBand, SectionScore } from '../../../shared/inspection-score';

// Components
import { SharedModule } from '../../shared/shared.module/shared.module';
import { WorkflowButtonsComponent } from '../../workflow-buttons/workflow-buttons.component';

@Component({
  selector: 'app-valuation-quality-control',
  standalone: true,
  imports: [RouterModule, SharedModule, WorkflowButtonsComponent, CommonModule, FormsModule],
  templateUrl: './quality-control-view.component.html',
  styleUrls: ['./quality-control-view.component.scss']
})
export class QualityControlViewComponent implements OnInit {
  loading = true;
  error: string | null = null;

  private authz = inject(AuthorizationService);

  viewModel: QualityControlViewModel | null = null;

  // ── What the photos say (read-only mirror of the update page) ───────────
  aiRunning = false;
  aiError: string | null = null;
  aiReadAt: string | null = null;
  aiVerified = new Set<string>();
  private savedByReviewer = new Set<string>();

  isAi(key: string): boolean { return this.aiVerified.has(key); }

  /**
   * Loads what the photos say. Read-only: this page shows the reading and the
   * evidence, but a verdict is only ever changed on the update page.
   */
  loadAiAudit(force = false): void {
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

          Object.entries(audit.why || {}).forEach(([k, v]) => {
            if (v && !this.savedByReviewer.has(k)) this.clWhy[k] = v;
          });

          Object.entries(audit.cl || {}).forEach(([k, v]) => {
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

  valuationId!: string;
  vehicleNumber!: string;
  applicantContact!: string;
  valuationType!: string;

  report!: FinalReport;
  photoKeys: (keyof PhotoUrls)[] = [];

  // ── Section scores, carried over from the AVO inspection ──
  sectionScores: SectionScore[] = [];
  overallScore: number | null = null;

  band(score: number | null): ScoreBand | null {
    return scoreBand(score);
  }

  // ✅ UPDATED: Return Status Display Variables
  returnMessage: string | null = null;
  returnedBy: string | null = null;

  // Checklist state (read-only on view page — editing happens on update page)
  cl: Record<string, string | null> = {};
  // What the system compared to reach each verdict, shown under the card.
  clWhy: Record<string, string> = {};
  clRemarks: Record<string, string> = { doc: '', acc: '', val: '', rec: '' };

  // ── Lightbox ──
  lightboxOpen = false;
  lightboxIndex = 0;

  openLightbox(index: number): void {
    this.lightboxIndex = index;
    this.lightboxOpen = true;
  }

  closeLightbox(): void { this.lightboxOpen = false; }

  prevPhoto(): void {
    this.lightboxIndex = (this.lightboxIndex - 1 + this.photoKeys.length) % this.photoKeys.length;
  }

  nextPhoto(): void {
    this.lightboxIndex = (this.lightboxIndex + 1) % this.photoKeys.length;
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    if (!this.lightboxOpen) return;
    if (e.key === 'ArrowLeft')  this.prevPhoto();
    if (e.key === 'ArrowRight') this.nextPhoto();
    if (e.key === 'Escape')     this.closeLightbox();
  }

  // ── Helpers ──
  getVehicleAge(): number {
    return new Date().getFullYear() - (this.report?.vehicleDetails?.yearOfMfg || new Date().getFullYear());
  }

  /**
   * The headline score: the mean of the AVO's section scores.
   *
   * Falls back to the QC officer's typed Overall Rating only when there is no
   * inspection data to score — an unfilled inspection should not borrow a
   * number from somewhere else.
   */
  getRatingDisplay(): string {
    if (this.overallScore !== null) return this.overallScore.toFixed(1);

    const raw = (this.report?.qualityControl?.overallRating || this.viewModel?.overallRating || '').trim();
    if (!raw) return '—';
    const num = Number(raw);
    if (!isNaN(num)) return num.toFixed(1);
    const map: Record<string, string> = {
      'EXCELLENT': '9.5', 'VERY GOOD': '8.5', 'GOOD': '7.5',
      'AVERAGE': '5.0', 'BELOW AVERAGE': '3.5', 'POOR': '2.5', 'VERY POOR': '1.5'
    };
    return map[raw.toUpperCase()] ?? raw;
  }

  isInRange(): boolean {
    const amt  = Number(this.viewModel?.valuationAmount ?? 0);
    const low  = Number(this.viewModel?.lowRange  ?? 0);
    const high = Number(this.viewModel?.highRange ?? 0);
    return low > 0 && high > 0 && amt >= low && amt <= high;
  }

  // Quick-compare badge is driven by the QC officer's saved confirmation
  // (accChassis on the edit page), not by the auto-prefilled checklist.
  savedAccChassis: string | null = null;

  chassisCompareState(): 'match' | 'mismatch' | 'pending' {
    if (this.savedAccChassis === 'pass') return 'match';
    if (this.savedAccChassis === 'fail') return 'mismatch';
    return 'pending';
  }

  getVehicleTags(): string[] {
    const vd = this.report?.vehicleDetails;
    if (!vd) return [];
    return [
      vd.classOfVehicle,
      vd.fuel,
      vd.bodyType,
      vd.normsType,
      vd.makerVariant
    ].filter(Boolean) as string[];
  }

  /**
   * Derives every checklist verdict, and the evidence behind it, from the earlier
   * workflow steps. The rules live in shared/qc-checklist.ts so this page shows
   * exactly what the QC update page computed.
   */
  private prefillChecklist(): void {
    const result = buildQcChecklist({
      report: this.report,
      overallRating: this.viewModel?.overallRating ?? this.report?.qualityControl?.overallRating,
      chassisPunch: this.viewModel?.chassisPunch ?? this.report?.qualityControl?.chassisPunch,
      valuationAmount: this.viewModel?.valuationAmount,
      lowRange: this.viewModel?.lowRange,
      highRange: this.viewModel?.highRange,
      photoKeys: this.photoKeys as string[],
      vehicleSegment: this.report?.stakeholder?.vehicleSegment,
      valuationType: this.valuationType
    });

    this.cl = result.cl;
    this.clWhy = result.why;

    // Pre-fill summary remarks with QC remarks if available
    if (this.viewModel?.remarks && !this.clRemarks['rec']) {
      this.clRemarks['rec'] = this.viewModel.remarks;
    }
  }

  // --- RETURN VARIABLES (Renamed from Rejection) ---
  showReturnModal: boolean = false;
  showOverrideModal: boolean = false;
  
  returnReason: string = '';
  selectedTargetStep: string = 'AVO'; // Default return target (can be AVO or Backend)
  
  // Override Data
  availableUsers: any[] = [];
  selectedOverrideUser: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private qcService: QualityControlService,
    private valuationService: ValuationService,
    private workflowService: WorkflowService, 
    private userService: UsersService,
    // Zoneless: the reading arrives long after load and needs an explicit nudge.
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.valuationType = this.route.snapshot.paramMap.get('valuationType')!;

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


  downloadPdf(): void {
    const url = `${environment.apiBaseUrl}Valuations/${this.valuationId}/valuationresponse/FinalReport/pdf`;
    const params = new HttpParams()
      .set('vehicleNumber', this.vehicleNumber)
      .set('applicantContact', this.applicantContact);
    window.open(`${url}?${params.toString()}`, '_blank');
  }

  private loadQueryParamsAndFetch() {
    this.route.queryParamMap.subscribe(qp => {
      const vn = qp.get('vehicleNumber');
      const ac = qp.get('applicantContact');
      this.valuationType = qp.get('valuationType')!;
      if (vn && ac) {
        this.vehicleNumber = vn;
        this.applicantContact = ac;
        
        // 1. Fetch Main Data
        this.fetchAllData();

        // 2. ✅ Fetch Return Status (To show "Returned By..." banner)
        this.checkReturnStatus(this.valuationId, vn, ac);

      } else {
        this.loading = false;
        this.error = 'Missing required query parameters (vehicleNumber / applicantContact).';
      }
    });
  }

  // ✅ ROBUST RETURN CHECKER & PARSER
  // Filters out stale returns created BY this step (QualityControl)
  private checkReturnStatus(id: string, vn: string, ac: string) {
    this.workflowService.getTable(id, vn, ac).subscribe({
      next: (table: any) => {
        // 1. Get the RedFlag
        const isRedFlag = String(table?.redFlag || table?.RedFlag || 'false').toLowerCase() === 'true';
        const remark = table?.remarks || table?.Remarks || '';

        // 2. Get Current Step
        const currentStep = table?.workflow || table?.Workflow || '';
        const isQCStep = currentStep === 'QualityControl' || currentStep === 'QC';

        // 3. Logic: Only show if RedFlag is true AND we are currently in QC step
        if (isRedFlag && remark && isQCStep) {
          
          const prefix = "RETURNED BY "; // ✅ Updated Prefix
          const remarkUpper = remark.toUpperCase();
          const prefixUpper = prefix.toUpperCase();

          if (remarkUpper.startsWith(prefixUpper)) {
            const splitIndex = remark.indexOf(':');
            
            if (splitIndex !== -1) {
              const returnerName = remark.substring(prefix.length, splitIndex).trim();
              
              // ⛔️ STALE RETURN CHECK ⛔️
              // If "Returned By QualityControl" (or QC) exists, it means *we* sent it back.
              // We shouldn't see our own return message in our own view.
              const invalidReturners = ['QUALITYCONTROL', 'QC'];
              
              if (invalidReturners.includes(returnerName.toUpperCase())) {
                 console.log(`QCView: Stale Return detected from [${returnerName}]. Hiding banner.`);
                 this.returnedBy = null;
                 this.returnMessage = null;
                 return; // Stop here
              }

              this.returnedBy = returnerName;
              this.returnMessage = remark.substring(splitIndex + 1).trim();
            } else {
              this.returnedBy = "Previous Stage"; 
              this.returnMessage = remark;
            }
          } else {
            // Fallback
            this.returnedBy = null; 
            this.returnMessage = remark;
          }
        } else {
          // If not red flag OR not QC step, hide the banner
          this.returnMessage = null;
          this.returnedBy = null;
        }
      },
      error: (err) => console.error('QCView: Failed to fetch workflow table', err)
    });
  }

  private fetchAllData(): void {
    this.loading = true;
    this.error = null;

    const qc$ = this.qcService.getQualityControlDetails(
      this.valuationId,
      this.vehicleNumber,
      this.applicantContact
    );

    const report$ = this.valuationService.getFinalReport(
      this.valuationId,
      this.vehicleNumber,
      this.applicantContact
    );

    forkJoin({ qcData: qc$, reportData: report$ }).subscribe({
      next: ({ qcData, reportData }) => {
        this.report = reportData;
        this.photoKeys = Object.keys(this.report.photoUrls || {}) as (keyof PhotoUrls)[];

        // Overall score is derived from the AVO's own section scores, not from
        // the hand-typed Overall Rating — so this page, the AVO page and the
        // report's cover gauge all show the same number.
        const scored = scoreInspection(
          reportData.stakeholder?.vehicleSegment,
          reportData.inspectionDetails as unknown as Record<string, unknown>,
          this.valuationType
        );
        this.sectionScores = scored.sections;
        this.overallScore = scored.overall;

        const ve = reportData.valuationResponse;
        this.viewModel = {
          overallRating:   qcData.overallRating,
          valuationAmount: qcData.valuationAmount,
          chassisPunch:    qcData.chassisPunch,
          remarks:         qcData.remarks,

          lowRange:    ve?.lowRange    ?? (ve as any)?.LowRange,
          midRange:    ve?.midRange    ?? (ve as any)?.MidRange,
          highRange:   ve?.highRange   ?? (ve as any)?.HighRange,
          rawResponse: ve?.rawResponse ?? (ve as any)?.RawResponse
        };
        this.prefillChecklist();

        // Saved-only value for the quick-compare badge: stays "Waiting for
        // Approval" until the officer confirms & saves on the edit page
        this.savedAccChassis = qcData.qcChecklist?.['accChassis'] ?? null;

        // Override prefilled values with whatever was previously saved by the QC officer
        applySavedChecklist({ cl: this.cl, why: this.clWhy }, qcData.qcChecklist);
        if (qcData.qcChecklistRemarks) {
          Object.entries(qcData.qcChecklistRemarks).forEach(([k, v]) => {
            if (v) this.clRemarks[k] = v;
          });
        }

        // Whatever the reviewer saved is theirs; the reading lands after this.
        this.savedByReviewer = new Set(
          Object.entries(qcData.qcChecklist || {})
            .filter(([, v]) => v !== null && v !== undefined)
            .map(([k]) => k)
        );

        this.loading = false;

        // Same reading as the update page, and free after the first open because
        // the backend keeps it against the photo set. This page only displays it.
        this.loadAiAudit();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        if (err.error?.message) {
          this.error = err.error.message;
        } else if (err.status === 404) {
          this.error = 'Quality control or valuation estimate record not found.';
        } else {
          this.error = `Unexpected error (${err.status}): ${err.message}`;
        }
      }
    });
  }

  onEdit(): void {
    this.router.navigate(
      ['/valuation', this.valuationId, 'quality-control', 'update'],
      {
        queryParams: {
          vehicleNumber: this.vehicleNumber,
          applicantContact: this.applicantContact,
          valuationType: this.valuationType
        }
      }
    );
  }

  onDelete(): void {
    if (!confirm('Delete this quality control record?')) return;
    this.qcService
      .deleteQualityControlDetails(this.valuationId, this.vehicleNumber, this.applicantContact)
      .subscribe({
        next: () => this.router.navigate(['/']),
        error: (err) => (this.error = err.message || 'Delete failed')
      });
  }

  onBack(): void {
    this.router.navigate(['/valuation', this.valuationId], {
      queryParams: {
        vehicleNumber: this.vehicleNumber,
        applicantContact: this.applicantContact,
        valuationType: this.valuationType
      }
    });
  }

  canEditQualityControl() {
    return this.authz.hasAnyPermission(['CanCreateQualityControl', 'CanEditQualityControl']);
  }
  canDeleteQualityControl() {
    return this.authz.hasAnyPermission(['CanDeleteQualityControl']);
  }

  getCurrentUser(): string {
    try {
      const user = this.getCurrentUserObj();
      return user.name || user.username || user.email || 'User';
    } catch {
      return 'User';
    }
  }

  getCurrentUserObj(): any {
    try {
      const userJson = localStorage.getItem('currentUser') || localStorage.getItem('user') || '{}';
      return JSON.parse(userJson);
    } catch {
      return {};
    }
  }

  // =================================================================
  //  NEW RETURN LOGIC (Supports AVO & Backend targets)
  // =================================================================

  openReturnModal() {
    this.returnReason = '';
    this.selectedTargetStep = 'AVO'; // Default target
    this.showReturnModal = true;
  }

  submitReturn() {
    if (!this.returnReason) {
      alert("Please provide a reason for returning.");
      return;
    }
    this.callReturnApi("");
  }

  callReturnApi(overrideId: string) {
    const currentUserJson = this.getCurrentUserObj(); 
    
    // ✅ Calling returnWorkflow
    this.workflowService.returnWorkflow(
      this.valuationId,
      this.vehicleNumber,
      this.applicantContact,
      "QualityControl",   // Current Step
      this.returnReason,  // Reason
      currentUserJson.userId || '',
      currentUserJson.name || '',
      this.selectedTargetStep, // 'AVO' or 'Backend'
      overrideId
    ).subscribe({
      next: () => {
        alert(`Case Returned Successfully. Sent back to ${this.selectedTargetStep}.`);
        this.closeModals();
        this.onBack();
      },
      error: (err: any) => {
        // Handle 400 Error -> Open Override Modal
        if (err.status === 400 && err.error?.message?.includes("overrideAssigneeId")) {
          this.showReturnModal = false; 
          this.fetchOverrideUsers(); // Fetch users for the selected target step
        } else {
          alert("Error: " + (err.error?.message || "Unknown error occurred"));
        }
      }
    });
  }

  fetchOverrideUsers() {
    // The backend expects specific role names: "AVO" or "Backend"
    let roleToFetch = this.selectedTargetStep;
    if(roleToFetch === 'Backend') roleToFetch = 'BackEnd'; // Handle potential casing diffs

    this.userService.getUsersByRole(roleToFetch).subscribe({
      next: (users: any[]) => {
        this.availableUsers = users;
        this.showOverrideModal = true;
      },
      error: () => {
        alert(`Could not fetch users for role: ${roleToFetch}.`);
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
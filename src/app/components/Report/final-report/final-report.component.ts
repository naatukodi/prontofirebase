// src/app/components/Report/final-report/final-report.component.ts

import { Component, OnInit, OnDestroy, HostListener, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { BrandService } from '../../../services/brand.service';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { ValuationService } from '../../../services/valuation.service';
import { ValuationResponseService } from '../../../services/valuation-response.service';
import { FinalReport, PhotoUrls } from '../../../models/final-report.model';
import { QualityControlViewModel } from '../../../models/QualityControlViewModel';
import { environment } from '../../../../environments/environment';
import { SharedModule } from '../../shared/shared.module/shared.module';
import { WorkflowButtonsComponent } from '../../workflow-buttons/workflow-buttons.component';
import { AuthorizationService } from '../../../services/authorization.service';
import { WorkflowService } from '../../../services/workflow.service';
import { UsersService } from '../../../services/users.service';
import { scoreInspection, SectionScore, mapVerdict } from '../../../shared/inspection-score';
import { buildQcChecklist, applySavedChecklist } from '../../../shared/qc-checklist';

@Component({
  selector: 'app-final-report-view',
  standalone: true,
  imports: [SharedModule, WorkflowButtonsComponent, FormsModule, CommonModule],
  templateUrl: './final-report.component.html',
  styleUrls: ['./final-report.component.scss'],
})
export class FinalReportComponent implements OnInit, OnDestroy {
  /** Public: the report header/footer bind their platform name to this. */
  brand = inject(BrandService);

  valuationId!: string;
  vehicleNumber!: string;
  applicantContact!: string;
  valuationType!: string;

  loading = true;
  error: string | null = null;
  downloadingPdf = false;

  // ── Report PDF: preview always, download only once approved ──────────────
  // The generator is the single source of truth for what the customer receives,
  // so the preview is the real PDF rather than an HTML mock-up of it. It is
  // fetched once and the same blob serves both the iframe and the download, so
  // approving a case does not regenerate it.
  /** True once the workflow row reads Completed — i.e. the case was approved. */
  caseApproved = false;
  showPreviewModal = false;
  previewLoading = false;
  previewError: string | null = null;
  /** Object URL for the fetched PDF; revoked on destroy. */
  private pdfObjectUrl: string | null = null;
  pdfPreviewUrl: SafeResourceUrl | null = null;

  report!: FinalReport;
  photoKeys: (keyof PhotoUrls)[] = [];
  // Photos QC chose for the PDF gallery page (falls back to all photoKeys if QC never set one)
  selectedPhotoKeys: (keyof PhotoUrls)[] = [];

  viewModel: QualityControlViewModel | null = null;
  cl: Record<string, string | null> = {};
  /** What the engine compared to reach each verdict — kept so the saved-value
   *  overlay can annotate an override, even though the report prints verdicts only. */
  clWhy: Record<string, string> = {};
  clRemarks: Record<string, string> = { doc: '', acc: '', val: '', rec: '' };

  // ── Section scores, carried over from the AVO inspection ──
  sectionScores: SectionScore[] = [];
  overallScore: number | null = null;

  // ── Hero lightbox (browses ALL photos, unaffected by QC's gallery selection) ──
  lightboxOpen = false;
  lightboxIndex = 0;

  openLightbox(index: number = 0): void { this.lightboxIndex = index; this.lightboxOpen = true; }
  closeLightbox(): void { this.lightboxOpen = false; }
  nextPhoto(): void { this.lightboxIndex = (this.lightboxIndex + 1) % this.photoKeys.length; }
  prevPhoto(): void { this.lightboxIndex = (this.lightboxIndex - 1 + this.photoKeys.length) % this.photoKeys.length; }

  // ── "Vehicle Photographs" card lightbox (browses only the QC-selected photos) ──
  galleryLightboxOpen = false;
  galleryLightboxIndex = 0;

  openGalleryLightbox(index: number = 0): void { this.galleryLightboxIndex = index; this.galleryLightboxOpen = true; }
  closeGalleryLightbox(): void { this.galleryLightboxOpen = false; }
  nextGalleryPhoto(): void { this.galleryLightboxIndex = (this.galleryLightboxIndex + 1) % this.selectedPhotoKeys.length; }
  prevGalleryPhoto(): void { this.galleryLightboxIndex = (this.galleryLightboxIndex - 1 + this.selectedPhotoKeys.length) % this.selectedPhotoKeys.length; }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    if (this.lightboxOpen) {
      if (e.key === 'ArrowLeft')  this.prevPhoto();
      if (e.key === 'ArrowRight') this.nextPhoto();
      if (e.key === 'Escape')     this.closeLightbox();
    } else if (this.galleryLightboxOpen) {
      if (e.key === 'ArrowLeft')  this.prevGalleryPhoto();
      if (e.key === 'ArrowRight') this.nextGalleryPhoto();
      if (e.key === 'Escape')     this.closeGalleryLightbox();
    }
  }

  // ── Helpers ──
  getVehicleAge(): number {
    return new Date().getFullYear() - (this.report?.vehicleDetails?.yearOfMfg || new Date().getFullYear());
  }

  /**
   * The headline score: the mean of the AVO's section scores, computed by the
   * same engine the AVO page, the QC page and the printed report's cover gauge
   * use. Falls back to the stored rating only when there is nothing to score.
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

  chassisNumbersMatch(): boolean {
    const chassis = (this.report?.vehicleDetails?.chassisNumber || '').toUpperCase().trim();
    const stencil = (this.report?.vehicleDetails?.stencilTrace  || '').toUpperCase().trim();
    return chassis.length > 0 && stencil.length > 0 && chassis === stencil;
  }

  getVehicleTags(): string[] {
    const vd = this.report?.vehicleDetails;
    if (!vd) return [];
    return [vd.classOfVehicle, vd.fuel, vd.bodyType, vd.normsType, vd.makerVariant].filter(Boolean) as string[];
  }

  /**
   * Derives every checklist verdict from the shared engine — the same one both
   * QC pages use. This page used to carry its own simplified copy of the rules,
   * which had drifted: it never set docHypo at all (so Hypothecation printed
   * blank on the report while QC showed Yes/No), and it passed several checks on
   * the mere existence of a field where the engine now requires a comparison.
   */
  private prefillChecklist(): void {
    const qc = this.report?.qualityControl;

    const result = buildQcChecklist({
      report: this.report,
      overallRating: this.viewModel?.overallRating ?? qc?.overallRating,
      chassisPunch: this.viewModel?.chassisPunch ?? qc?.chassisPunch,
      valuationAmount: this.viewModel?.valuationAmount,
      lowRange: this.viewModel?.lowRange,
      highRange: this.viewModel?.highRange,
      photoKeys: this.photoKeys as string[],
      vehicleSegment: this.report?.stakeholder?.vehicleSegment,
      valuationType: this.valuationType
    });

    this.cl = result.cl;
    this.clWhy = result.why;

    if (this.viewModel?.remarks && !this.clRemarks['rec']) {
      this.clRemarks['rec'] = this.viewModel.remarks;
    }
  }

  // --- APPROVE STATE ---
  showApproveModal = false;
  approveRemarks = '';

  onApprove(): void { this.approveRemarks = ''; this.showApproveModal = true; }

  confirmApprove(): void {
    const approvedBy = this.getCurrentUser();
    this.workflowService.completeWorkflow(
      this.valuationId, 5, this.vehicleNumber, encodeURIComponent(this.applicantContact), approvedBy
    ).subscribe({
      next: () => {
        // Stay on the page: approving is what unlocks the download, so leaving
        // for the case list would send the approver straight back here.
        this.caseApproved = true;
        this.showApproveModal = false;
        alert('✅ Case approved. Final report has been dispatched — you can now download the PDF.');
      },
      error: (err: any) => {
        const msg = err.error?.message || err.message || 'Approval processed.';
        alert(msg);
        this.showApproveModal = false;
      }
    });
  }

  // --- REJECT STATE ---
  showRejectModal = false;
  rejectReason = '';

  openRejectModal(): void { this.rejectReason = ''; this.showRejectModal = true; }

  confirmReject(): void {
    if (!this.rejectReason) { alert('Please provide a reason for rejection.'); return; }
    alert('❌ Case rejected. Reason has been recorded.');
    this.showRejectModal = false;
    this.onBack();
  }

  // --- RETURN STATE ---
  showReturnModal = false;
  showOverrideModal = false;
  returnReason = '';
  availableUsers: any[] = [];
  selectedOverrideUser = '';
  targetStep = 'QualityControl';

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private valuationService: ValuationService,
    private valuationResponseService: ValuationResponseService,
    private authz: AuthorizationService,
    private workflowService: WorkflowService,
    private userService: UsersService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.valuationId = this.route.snapshot.paramMap.get('valuationId')!;
    this.route.queryParamMap.subscribe((params) => {
      this.vehicleNumber    = params.get('vehicleNumber')!;
      this.applicantContact = params.get('applicantContact')!;
      this.valuationType    = params.get('valuationType')!;
      this.loadFinalReport();
      this.loadApprovalState();
    });
  }

  ngOnDestroy(): void {
    if (this.pdfObjectUrl) URL.revokeObjectURL(this.pdfObjectUrl);
  }

  /**
   * Whether the case has been approved. The workflow row is the authority — the
   * approve button completes step 5, which sets the row's status to Completed.
   * A failed lookup leaves the case un-approved, so the download stays shut
   * rather than opening on an error.
   */
  private loadApprovalState(): void {
    this.workflowService
      .getTable(this.valuationId, this.vehicleNumber, this.applicantContact)
      .subscribe({
        next: (table) => {
          this.caseApproved = (table?.status || '').trim().toLowerCase() === 'completed';
        },
        error: () => { this.caseApproved = false; }
      });
  }

  private loadFinalReport(): void {
    this.loading = true;
    this.error   = null;

    this.valuationService
      .getFinalReport(this.valuationId, this.vehicleNumber, this.applicantContact)
      .subscribe({
        next: (data: FinalReport) => {
          this.report    = data;
          this.photoKeys = Object.keys(this.report.photoUrls || {}) as (keyof PhotoUrls)[];
          this.selectedPhotoKeys = this.photoKeys;

          const scored = scoreInspection(
            data.stakeholder?.vehicleSegment,
            data.inspectionDetails as unknown as Record<string, unknown>,
            this.valuationType
          );
          this.sectionScores = scored.sections;
          this.overallScore = scored.overall;

          this.valuationService
            .getGalleryPhotoSelection(this.valuationId, this.vehicleNumber, this.applicantContact)
            .subscribe((selection) => {
              this.selectedPhotoKeys = (!selection || selection.length === 0)
                ? this.photoKeys
                : this.photoKeys.filter(k => selection.includes(k as string));
            });

          const qc = data.qualityControl;
          const ve = data.valuationResponse;
          this.viewModel = {
            overallRating:   qc?.overallRating  ?? '',
            valuationAmount: qc?.valuationAmount ?? 0,
            chassisPunch:    qc?.chassisPunch    ?? '',
            remarks:         qc?.remarks         ?? '',
            lowRange:    ve?.lowRange    ?? (ve as any)?.LowRange    ?? 0,
            midRange:    ve?.midRange    ?? (ve as any)?.MidRange    ?? 0,
            highRange:   ve?.highRange   ?? (ve as any)?.HighRange   ?? 0,
            rawResponse: ve?.rawResponse ?? (ve as any)?.RawResponse ?? ''
          };

          this.prefillChecklist();

          applySavedChecklist({ cl: this.cl, why: this.clWhy }, qc?.qcChecklist);
          if (qc?.qcChecklistRemarks) {
            Object.entries(qc.qcChecklistRemarks).forEach(([k, v]) => {
              if (v) this.clRemarks[k] = v;
            });
          }

          this.loading = false;
        },
        error: (err: any) => {
          this.error   = err.message || 'Failed to load final report';
          this.loading = false;
        },
      });
  }

  /** Opens the preview, generating the report the first time it is asked for. */
  openPreview(): void {
    this.showPreviewModal = true;
    this.loadPdfPreview();
  }

  /** Approve straight from the preview — the point of checking it first. */
  approveFromPreview(): void {
    this.showPreviewModal = false;
    this.onApprove();
  }

  /** Fetches the report and hands it to the preview frame. */
  loadPdfPreview(force = false): void {
    if (this.previewLoading) return;
    if (this.pdfObjectUrl && !force) return;

    this.previewLoading = true;
    this.previewError = null;

    this.http
      .get(`${environment.pdfApiBaseUrl}/api/Valuation/FinalReport/pdf`, {
        params: this.pdfParams(),
        responseType: 'blob',
      })
      .subscribe({
        next: (blob) => {
          if (this.pdfObjectUrl) URL.revokeObjectURL(this.pdfObjectUrl);
          // The generator sets the content type, but a blob served without one
          // makes the browser offer a download instead of rendering it inline.
          this.pdfObjectUrl = URL.createObjectURL(
            blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' })
          );
          this.pdfPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
            `${this.pdfObjectUrl}#toolbar=0&navpanes=0`);
          this.previewLoading = false;
        },
        error: () => {
          this.previewError = 'The report could not be generated for preview. Try again.';
          this.previewLoading = false;
        },
      });
  }

  /**
   * Saves the report. Only offered once the case is approved — an unapproved
   * case can be read on screen but must not leave the portal as a file, since a
   * downloaded PDF is indistinguishable from a final one.
   */
  /**
   * Tile colour for a condition recorded by the AVO, using the same vocabulary
   * the scoring engine normalises — so BRAKE SYSTEM: GOOD reads green like the
   * QC-derived tiles beside it rather than falling through to the unset grey.
   */
  condClass(value: string | null | undefined): string {
    switch (mapVerdict(value)) {
      case 'GOOD':
      case 'YES':     return 'cv-green';
      case 'AVERAGE': return 'cv-amber';
      case 'POOR':
      case 'BAD':
      case 'DAMAGED':
      case 'MISSING':
      case 'NO':      return 'cv-red';
      default:        return '';
    }
  }

  downloadPdf(): void {
    if (this.downloadingPdf || !this.caseApproved) return;

    // The preview already fetched it; save that rather than generating twice.
    if (this.pdfObjectUrl) { this.saveFrom(this.pdfObjectUrl); return; }

    this.downloadingPdf = true;
    this.http
      .get(`${environment.pdfApiBaseUrl}/api/Valuation/FinalReport/pdf`, {
        params: this.pdfParams(),
        responseType: 'blob',
      })
      .subscribe({
        next: (blob) => {
          const objectUrl = URL.createObjectURL(blob);
          this.saveFrom(objectUrl);
          URL.revokeObjectURL(objectUrl);
          this.downloadingPdf = false;
        },
        error: () => {
          this.error = 'PDF generation failed. Please try again.';
          this.downloadingPdf = false;
        },
      });
  }

  private pdfParams(): HttpParams {
    return new HttpParams()
      .set('id', this.valuationId)
      .set('vehicleNumber', this.vehicleNumber)
      .set('applicantContact', this.applicantContact);
  }

  private saveFrom(objectUrl: string): void {
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `${this.vehicleNumber}_report.pdf`;
    a.click();
  }

  onBack(): void {
    this.router.navigate(['/valuation', this.valuationId], {
      queryParams: { vehicleNumber: this.vehicleNumber, applicantContact: this.applicantContact, valuationType: this.valuationType },
    });
  }

  onEdit(): void {
    this.router.navigate(['/valuation', this.valuationId, 'final-report', 'update'], {
      queryParams: { vehicleNumber: this.vehicleNumber, applicantContact: this.applicantContact, valuationType: this.valuationType }
    });
  }

  onDelete(): void {
    if (!confirm('Delete this final report?')) return;
    this.valuationResponseService
      .deleteValuationResponse(this.valuationId, this.vehicleNumber, this.applicantContact)
      .subscribe({
        next: () => this.router.navigate(['/']),
        error: (err: any) => (this.error = err.message || 'Delete failed')
      });
  }

  canEditFinalReport(): boolean {
    return this.authz.hasAnyPermission(['CanCreateFinalReport', 'CanEditFinalReport']);
  }
  canDeleteFinalReport(): boolean {
    return this.authz.hasAnyPermission(['CanDeleteFinalReport']);
  }

  openReturnModal(): void { this.returnReason = ''; this.showReturnModal = true; }

  submitReturn(): void {
    if (!this.returnReason) { alert('Please provide a reason for returning.'); return; }
    this.callReturnApi('');
  }

  callReturnApi(overrideId: string): void {
    const u = this.getCurrentUserObj();
    this.workflowService.returnWorkflow(
      this.valuationId, this.vehicleNumber, this.applicantContact,
      'FinalReport', this.returnReason, u.userId || '', u.name || '',
      this.targetStep, overrideId
    ).subscribe({
      next: () => {
        alert('Report Returned Successfully. Sent back to Quality Control.');
        this.closeModals();
        this.onBack();
      },
      error: (err: any) => {
        if (err.status === 400 && err.error?.message?.includes('overrideAssigneeId')) {
          this.showReturnModal = false;
          this.fetchQCUsers();
        } else {
          alert('Error: ' + (err.error?.message || 'Unknown error occurred'));
        }
      }
    });
  }

  fetchQCUsers(): void {
    this.userService.getUsersByRole('QualityControl').subscribe({
      next: (users: any[]) => { this.availableUsers = users; this.showOverrideModal = true; },
      error: () => { alert('Could not fetch user list for override. Please contact admin.'); }
    });
  }

  confirmOverride(): void {
    if (this.selectedOverrideUser) this.callReturnApi(this.selectedOverrideUser);
  }

  closeModals(): void {
    this.showReturnModal   = false;
    this.showOverrideModal = false;
    this.showApproveModal  = false;
    this.showPreviewModal  = false;
    this.showRejectModal   = false;
  }

  getCurrentUser(): string {
    try {
      const u = this.getCurrentUserObj();
      return u.name || u.username || u.email || 'User';
    } catch { return 'User'; }
  }

  getCurrentUserObj(): any {
    try {
      return JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || '{}');
    } catch { return {}; }
  }
}

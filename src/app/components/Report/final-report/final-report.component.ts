// src/app/components/Report/final-report/final-report.component.ts

import { Component, OnInit, HostListener } from '@angular/core';
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
import { CommonNotesComponent } from '../../common-notes/common-notes.component';
import { WorkflowService } from '../../../services/workflow.service';
import { UsersService } from '../../../services/users.service';

@Component({
  selector: 'app-final-report-view',
  standalone: true,
  imports: [SharedModule, WorkflowButtonsComponent, CommonNotesComponent, FormsModule, CommonModule],
  templateUrl: './final-report.component.html',
  styleUrls: ['./final-report.component.scss'],
})
export class FinalReportComponent implements OnInit {
  valuationId!: string;
  vehicleNumber!: string;
  applicantContact!: string;
  valuationType!: string;

  loading = true;
  error: string | null = null;
  downloadingPdf = false;

  report!: FinalReport;
  photoKeys: (keyof PhotoUrls)[] = [];
  // Photos QC chose for the PDF gallery page (falls back to all photoKeys if QC never set one)
  selectedPhotoKeys: (keyof PhotoUrls)[] = [];

  viewModel: QualityControlViewModel | null = null;
  cl: Record<string, string | null> = {};
  clRemarks: Record<string, string> = { doc: '', acc: '', val: '', rec: '' };

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

  getRatingDisplay(): string {
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

  private prefillChecklist(): void {
    const vd  = this.report?.vehicleDetails;
    const ins = this.report?.inspectionDetails;
    const qc  = this.report?.qualityControl;

    const chassisPunch  = (this.viewModel?.chassisPunch || qc?.chassisPunch || '').toUpperCase().replace(/[-\s]/g, '');
    const overallRating = (this.viewModel?.overallRating || qc?.overallRating || '').toUpperCase();
    const engineCond    = (ins?.engineCondition     || '').toUpperCase();
    const tyreCond      = (ins?.overallTyreCondition || '').toUpperCase();
    const exteriorCond  = (ins?.exteriorCondition   || '').toUpperCase();
    const bodyCondition = (ins?.bodyCondition       || '').toUpperCase();
    const valuationAmt  = this.viewModel?.valuationAmount ?? 0;
    const low           = Number(this.viewModel?.lowRange  ?? 0);
    const high          = Number(this.viewModel?.highRange ?? 0);

    const condMap = (val: string): string | null => {
      if (val === 'GOOD') return 'good';
      if (val === 'AVERAGE') return 'average';
      if (val === 'POOR') return 'poor';
      return null;
    };

    // Document Verification
    if (vd?.registrationNumber) this.cl['docRC'] = 'ok';
    if (chassisPunch === 'ORIGINAL')       this.cl['docChassis'] = 'original';
    else if (chassisPunch === 'REPUNCHED') this.cl['docChassis'] = 'repunched';
    else if (chassisPunch === 'TAMPERED')  this.cl['docChassis'] = 'tampered';

    // Data Accuracy
    if (vd?.registrationNumber)                    this.cl['accReg']       = 'pass';
    if (vd?.chassisNumber || (ins as any)?.vinPlate) this.cl['accChassis'] = 'pass';
    if ((ins?.odometer ?? 0) > 0)                  this.cl['accOdo']       = 'pass';
    if (vd?.make && vd?.model)                     this.cl['accVahan']     = 'pass';
    if (this.report?.stakeholder?.applicant?.name) this.cl['accOwner']     = 'pass';
    if (vd?.ownerName)                             this.cl['accSerial']    = 'pass';
    if (ins?.vehicleInspectedBy)                   this.cl['accMandatory'] = 'pass';
    if (ins?.remarks || ins?.vehicleInspectedBy)   this.cl['accRemarks']   = 'pass';

    // Valuation Quality
    const photoCount = this.photoKeys?.length ?? 0;
    if (photoCount >= 8)      this.cl['valMinPhotos'] = 'pass';
    else if (photoCount > 0)  this.cl['valMinPhotos'] = 'fail';
    if (low > 0 && high > 0)  this.cl['valInRange'] = (valuationAmt >= low && valuationAmt <= high) ? 'pass' : 'fail';
    if (vd?.yearOfMfg && (ins?.odometer ?? 0) > 0) {
      const age = new Date().getFullYear() - vd.yearOfMfg;
      this.cl['valAgeOdo'] = age > 0 && (ins!.odometer / age) < 60000 ? 'pass' : 'fail';
    }
    if (overallRating === 'GOOD')       this.cl['valScore'] = 'pass';
    else if (overallRating === 'POOR')  this.cl['valScore'] = 'fail';

    // QC Recommendation
    this.cl['recCondition'] = condMap(overallRating);
    this.cl['recEngine']    = condMap(engineCond);

    const extVal = exteriorCond || bodyCondition;
    if (extVal === 'GOOD')                        this.cl['recExterior'] = 'good';
    else if (extVal === 'AVERAGE' || extVal === 'FAIR') this.cl['recExterior'] = 'minor';
    else if (extVal === 'POOR')                   this.cl['recExterior'] = 'major';

    if (tyreCond === 'GOOD')         this.cl['recTyre'] = 'good';
    else if (tyreCond === 'AVERAGE') this.cl['recTyre'] = 'average';
    else if (tyreCond === 'POOR')    this.cl['recTyre'] = 'replacement';

    if (chassisPunch === 'TAMPERED' || overallRating === 'POOR') {
      this.cl['recFinal'] = 'not-recommended';
    } else if (overallRating === 'GOOD' && chassisPunch === 'ORIGINAL') {
      this.cl['recFinal'] = 'recommended';
    } else {
      this.cl['recFinal'] = 'conditional';
    }

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
        alert('✅ Case approved. Final report has been dispatched.');
        this.showApproveModal = false;
        this.onBack();
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
    private userService: UsersService
  ) {}

  ngOnInit(): void {
    this.valuationId = this.route.snapshot.paramMap.get('valuationId')!;
    this.route.queryParamMap.subscribe((params) => {
      this.vehicleNumber    = params.get('vehicleNumber')!;
      this.applicantContact = params.get('applicantContact')!;
      this.valuationType    = params.get('valuationType')!;
      this.loadFinalReport();
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

          if (qc?.qcChecklist) {
            Object.entries(qc.qcChecklist).forEach(([k, v]) => {
              if (v !== null && v !== undefined) this.cl[k] = v;
            });
          }
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

  downloadPdf(): void {
    if (this.downloadingPdf) return;
    this.downloadingPdf = true;

    const params = new HttpParams()
      .set('id', this.valuationId)
      .set('vehicleNumber', this.vehicleNumber)
      .set('applicantContact', this.applicantContact);

    this.http
      .get(`${environment.pdfApiBaseUrl}/api/Valuation/FinalReport/pdf`, {
        params,
        responseType: 'blob',
      })
      .subscribe({
        next: (blob) => {
          const objectUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = objectUrl;
          a.download = `${this.vehicleNumber}_report.pdf`;
          a.click();
          URL.revokeObjectURL(objectUrl);
          this.downloadingPdf = false;
        },
        error: () => {
          this.error = 'PDF generation failed. Please try again.';
          this.downloadingPdf = false;
        },
      });
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

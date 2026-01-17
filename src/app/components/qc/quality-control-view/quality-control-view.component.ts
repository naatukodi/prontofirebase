// src/app/valuation-quality-control/quality-control-view.component.ts

import { Component, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { FormsModule } from '@angular/forms'; // Import FormsModule

// Services
import { QualityControlService } from '../../../services/quality-control.service';
import { ValuationService } from '../../../services/valuation.service';
import { AuthorizationService } from '../../../services/authorization.service';
import { WorkflowService } from '../../../services/workflow.service'; // ✅ Added
import { UsersService } from '../../../services/users.service';         // ✅ Added

// Models
import { QualityControlViewModel } from '../../../models/QualityControlViewModel';
import { FinalReport, PhotoUrls } from '../../../models/final-report.model';
import { environment } from '../../../../environments/environment';

// Components
import { SharedModule } from '../../shared/shared.module/shared.module';
import { WorkflowButtonsComponent } from '../../workflow-buttons/workflow-buttons.component';
import { CommonNotesComponent } from '../../common-notes/common-notes.component';

@Component({
  selector: 'app-valuation-quality-control',
  standalone: true,
  imports: [RouterModule, SharedModule, WorkflowButtonsComponent, CommonNotesComponent, CommonModule, FormsModule],
  templateUrl: './quality-control-view.component.html',
  styleUrls: ['./quality-control-view.component.scss']
})
export class QualityControlViewComponent implements OnInit {
  loading = true;
  error: string | null = null;

  private authz = inject(AuthorizationService);

  viewModel: QualityControlViewModel | null = null;

  valuationId!: string;
  vehicleNumber!: string;
  applicantContact!: string;
  valuationType!: string;

  report!: FinalReport;
  photoKeys: (keyof PhotoUrls)[] = [];

  // ✅ NEW: Rejection Display Variables
  rejectionMessage: string | null = null;
  rejectedBy: string | null = null;

  // --- REJECTION VARIABLES ---
  showRejectModal: boolean = false;
  showOverrideModal: boolean = false;
  
  rejectReason: string = '';
  selectedTargetStep: string = 'AVO'; // Default reject target
  
  // Override Data
  availableUsers: any[] = [];
  selectedOverrideUser: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private qcService: QualityControlService,
    private valuationService: ValuationService,
    private workflowService: WorkflowService, // ✅ Injected
    private userService: UsersService         // ✅ Injected
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

    this.loadFinalReport();
  }

  private loadFinalReport(): void {
    this.valuationService
      .getFinalReport(this.valuationId, this.vehicleNumber, this.applicantContact)
      .subscribe({
        next: (data: FinalReport) => {
          this.report = data;
          this.photoKeys = Object.keys(this.report.photoUrls) as (keyof PhotoUrls)[];
        },
        error: (err) => {
          // Ideally handle error silently if report isn't ready yet, or log it
          console.warn('Final report data load failed (optional):', err);
        },
      });
  }

  downloadPdf(): void {
    const url = `${environment.apiBaseUrl}/Valuations/${this.valuationId}/valuationresponse/FinalReport/pdf`;
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

        // 2. ✅ Fetch Rejection Status (To show "Rejected By..." banner)
        this.checkRejectionStatus(this.valuationId, vn, ac);

      } else {
        this.loading = false;
        this.error = 'Missing required query parameters (vehicleNumber / applicantContact).';
      }
    });
  }

  // ✅ ROBUST REJECTION CHECKER & PARSER
  // UPDATED: Now filters out stale rejections from QC itself
  private checkRejectionStatus(id: string, vn: string, ac: string) {
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
          
          const prefix = "REJECTED by ";
          const remarkUpper = remark.toUpperCase();
          const prefixUpper = prefix.toUpperCase();

          if (remarkUpper.startsWith(prefixUpper)) {
            const splitIndex = remark.indexOf(':');
            
            if (splitIndex !== -1) {
              const rejectorName = remark.substring(prefix.length, splitIndex).trim();
              
              // ⛔️ STALE REJECTION CHECK ⛔️
              // If "Rejected By QualityControl" (or QC) and we are IN "QualityControl" step,
              // it means QC rejected it, and it came back. HIDE BANNER.
              const invalidRejectors = ['QUALITYCONTROL', 'QC', 'AVO', 'BACKEND'];
              // Note: AVO/Backend logic is just defensive; mainly we care about QC here.
              // QC shouldn't see rejections from previous stages (AVO/Backend) either.
              
              if (invalidRejectors.includes(rejectorName.toUpperCase())) {
                 console.log(`QCView: Stale/Invalid Rejection detected from [${rejectorName}]. Hiding banner.`);
                 this.rejectedBy = null;
                 this.rejectionMessage = null;
                 return; // Stop here
              }

              this.rejectedBy = rejectorName;
              this.rejectionMessage = remark.substring(splitIndex + 1).trim();
            } else {
              this.rejectedBy = "Previous Stage"; 
              this.rejectionMessage = remark;
            }
          } else {
            // Fallback
            this.rejectedBy = null; 
            this.rejectionMessage = remark;
          }
        } else {
          // If not red flag OR not QC step, hide the banner
          this.rejectionMessage = null;
          this.rejectedBy = null;
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

    const ve$ = this.qcService.getValuationEstimate(
      this.valuationId,
      this.vehicleNumber,
      this.applicantContact
    );

    forkJoin({ qcData: qc$, veData: ve$ }).subscribe({
      next: ({ qcData, veData }) => {
        this.viewModel = {
          overallRating:  qcData.overallRating,
          valuationAmount: qcData.valuationAmount,
          chassisPunch:     qcData.chassisPunch,
          remarks:          qcData.remarks,

          lowRange:    veData.lowRange,
          midRange:    veData.midRange,
          highRange:   veData.highRange,
          rawResponse: veData.rawResponse
        };
        this.loading = false;
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
  //  NEW REJECTION LOGIC (Supports AVO & Backend targets)
  // =================================================================

  openRejectModal() {
    this.rejectReason = '';
    this.selectedTargetStep = 'AVO'; // Default target
    this.showRejectModal = true;
  }

  submitRejection() {
    if (!this.rejectReason) {
      alert("Please provide a reason for rejection.");
      return;
    }
    this.callRejectApi("");
  }

  callRejectApi(overrideId: string) {
    const currentUserJson = this.getCurrentUserObj(); 
    
    this.workflowService.rejectWorkflow(
      this.valuationId,
      this.vehicleNumber,
      this.applicantContact,
      "QualityControl",   // Current Step
      this.rejectReason,
      currentUserJson.userId || '',
      currentUserJson.name || '',
      this.selectedTargetStep, // User selected target (AVO or Backend)
      overrideId
    ).subscribe({
      next: () => {
        alert(`Case Rejected Successfully. Sent back to ${this.selectedTargetStep}.`);
        this.closeModals();
        this.onBack();
      },
      error: (err: any) => {
        // Handle 400 Error -> Open Override Modal
        if (err.status === 400 && err.error?.message?.includes("overrideAssigneeId")) {
          this.showRejectModal = false; 
          this.fetchOverrideUsers(); // Fetch users for the selected target step
        } else {
          alert("Error: " + (err.error?.message || "Unknown error occurred"));
        }
      }
    });
  }

  fetchOverrideUsers() {
    // The backend expects specific role names: "AVO" or "Backend"
    // Adjust role string if your DB uses different names (e.g., "BackEnd")
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
      this.callRejectApi(this.selectedOverrideUser);
    }
  }

  closeModals() {
    this.showRejectModal = false;
    this.showOverrideModal = false;
  }
}
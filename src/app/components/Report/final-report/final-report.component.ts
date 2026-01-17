// src/app/components/Report/final-report/final-report.component.ts

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common'; // Important for *ngIf

import { ValuationService } from '../../../services/valuation.service';
import { ValuationResponseService } from '../../../services/valuation-response.service';
import { FinalReport, PhotoUrls } from '../../../models/final-report.model';
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

  report!: FinalReport;
  photoKeys: (keyof PhotoUrls)[] = [];

  // --- REJECTION STATE VARIABLES ---
  showRejectModal: boolean = false;
  showOverrideModal: boolean = false;
  rejectReason: string = '';
  
  availableUsers: any[] = [];
  selectedOverrideUser: string = '';
  targetStep: string = 'QualityControl';

  constructor(
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
      this.vehicleNumber = params.get('vehicleNumber')!;
      this.applicantContact = params.get('applicantContact')!;
      this.valuationType = params.get('valuationType')!;
      this.loadFinalReport();
    });
  }

  private loadFinalReport(): void {
    this.loading = true;
    this.error = null;

    this.valuationService
      .getFinalReport(this.valuationId, this.vehicleNumber, this.applicantContact)
      .subscribe({
        next: (data: FinalReport) => {
          this.report = data;
          this.photoKeys = Object.keys(this.report.photoUrls) as (keyof PhotoUrls)[];
          this.loading = false;
        },
        error: (err: any) => {
          this.error = err.message || 'Failed to load final report';
          this.loading = false;
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

  onBack(): void {
    this.router.navigate(['/valuation', this.valuationId], {
      queryParams: {
        vehicleNumber: this.vehicleNumber,
        applicantContact: this.applicantContact,
        valuationType: this.valuationType
      },
    });
  }

  onEdit(): void {
    this.router.navigate(
      ['/valuation', this.valuationId, 'final-report', 'update'],
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
    if (!confirm('Delete this final report?')) return;
    this.valuationResponseService
      .deleteValuationResponse(this.valuationId, this.vehicleNumber, this.applicantContact)
      .subscribe({
        next: () => this.router.navigate(['/']),
        error: (err: any) => (this.error = err.message || 'Delete failed')
      });
  }

  canEditFinalReport() {
    return this.authz.hasAnyPermission(['CanCreateFinalReport', 'CanEditFinalReport']);
  }
  canDeleteFinalReport() {
    return this.authz.hasAnyPermission(['CanDeleteFinalReport']);
  }

  // =================================================================
  //  NEW REJECTION LOGIC
  // =================================================================

  openRejectModal() {
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  submitRejection() {
    if (!this.rejectReason) {
      alert("Please provide a reason for rejection.");
      return;
    }
    // Attempt rejection without override first
    this.callRejectApi("");
  }

  callRejectApi(overrideId: string) {
    const currentUserJson = this.getCurrentUserObj(); 
    
    this.workflowService.rejectWorkflow(
      this.valuationId,
      this.vehicleNumber,
      this.applicantContact,
      "FinalReport",      // Current Step
      this.rejectReason,
      currentUserJson.userId || '',
      currentUserJson.name || '',
      this.targetStep,    // 'QualityControl'
      overrideId          // Optional Override
    ).subscribe({
      next: () => {
        alert("Report Rejected Successfully. Sent back to Quality Control.");
        this.closeModals();
        this.onBack(); // Return to dashboard
      },
      error: (err: any) => {
        // Handle 400 Error -> Open Override Modal
        if (err.status === 400 && err.error?.message?.includes("overrideAssigneeId")) {
          this.showRejectModal = false; // Close reason modal
          this.fetchQCUsers();          // Load users for override
        } else {
          alert("Error: " + (err.error?.message || "Unknown error occurred"));
        }
      }
    });
  }

  fetchQCUsers() {
    // Assuming UsersService has this method. If not, use getAll() and filter manually.
    this.userService.getUsersByRole('QualityControl').subscribe({
      next: (users: any[]) => {
        this.availableUsers = users;
        this.showOverrideModal = true;
      },
      error: () => {
        alert("Could not fetch user list for override. Please contact admin.");
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

  getCurrentUserObj(): any {
    try {
      const userJson = localStorage.getItem('currentUser') || localStorage.getItem('user') || '{}';
      return JSON.parse(userJson);
    } catch {
      return {};
    }
  }
}
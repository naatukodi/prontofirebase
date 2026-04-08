// src/app/components/valution/valuation-vehicle-details/valuation-vehicle-details.component.ts

import { Component, OnInit, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Models
import { VehicleDetails } from '../../../models/VehicleDetails';
import { VehicleDuplicateCheckResponse } from '../../../models/vehicle-duplicate-check.interface';
import { environment } from '../../../../environments/environment';

// Services
import { ValuationService } from '../../../services/valuation.service';
import { AuthorizationService } from '../../../services/authorization.service';
import { WorkflowService } from '../../../services/workflow.service'; 
import { UsersService } from '../../../services/users.service';         

// Components
import { SharedModule } from '../../shared/shared.module/shared.module';
import { WorkflowButtonsComponent } from '../../workflow-buttons/workflow-buttons.component';
import { CommonNotesComponent } from '../../common-notes/common-notes.component';

@Component({
  selector: 'app-valuation-vehicle-details',
  standalone: true,
  imports: [SharedModule, WorkflowButtonsComponent, CommonModule, FormsModule, CommonNotesComponent],
  templateUrl: './valuation-vehicle-details.component.html',
  styleUrls: ['./valuation-vehicle-details.component.scss']
})
export class ValuationVehicleDetailsComponent implements OnInit {
  get totalDuplicatesFound(): number {
    return this.duplicateInfo?.totalDuplicatesFound ?? 0;
  }

  loading = true;
  error: string | null = null;
  vehicleDetails: VehicleDetails | null = null;
  duplicateInfo: VehicleDuplicateCheckResponse | null = null;

  private authz = inject(AuthorizationService);

  valuationId!: string;
  vehicleNumber!: string;
  applicantContact!: string;
  valuationType!: string;

  // ✅ UPDATED: Return Status Display Variables
  returnMessage: string | null = null;
  returnedBy: string | null = null;

  // --- RETURN ACTION VARIABLES ---
  showReturnModal: boolean = false;
  showOverrideModal: boolean = false;
  returnReason: string = '';
  selectedTargetStep: string = 'Stakeholder'; // Backend usually returns to Stakeholder
  
  // Override Data
  availableUsers: any[] = [];
  selectedOverrideUser: string = '';

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private valuationService: ValuationService,
    private workflowService: WorkflowService, // ✅ Injected
    private userService: UsersService         // ✅ Injected
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const vid = params.get('valuationId');
      this.valuationType = params.get('valuationType')!;
      if (vid) {
        this.valuationId = vid;
        this.loadQueryParamsAndFetch();
      } else {
        this.loading = false;
        this.error = 'Valuation ID is missing in the route.';
      }
    });
  }

  private loadQueryParamsAndFetch() {
    this.route.queryParamMap.subscribe(qp => {
      const vn = qp.get('vehicleNumber');
      const ac = qp.get('applicantContact');
      this.valuationType = qp.get('valuationType')!;
      if (vn && ac) {
        this.vehicleNumber = vn;
        this.applicantContact = ac;
        
        // 1. Fetch Data
        this.fetchVehicleDetails();

        // 2. ✅ Fetch Return Status (To show banner if AVO returned this)
        this.checkReturnStatus(this.valuationId, vn, ac);

      } else {
        this.loading = false;
        this.error = 'Missing required query parameters (vehicleNumber / applicantContact).';
      }
    });
  }

  // ✅ ROBUST RETURN CHECKER
  private checkReturnStatus(id: string, vn: string, ac: string) {
    this.workflowService.getTable(id, vn, ac).subscribe({
      next: (table: any) => {
        // 1. Get Flags
        const isRedFlag = String(table?.redFlag || table?.RedFlag || 'false').toLowerCase() === 'true';
        const remark = table?.remarks || table?.Remarks || '';

        // 2. Get Current Step
        const currentStep = table?.workflow || table?.Workflow || '';
        // Check if the current step is specifically 'Backend'
        const isBackendStep = currentStep === 'Backend' || currentStep === 'BackEnd';

        // 3. Logic: Only show if RedFlag is true AND we are currently in Backend step
        if (isRedFlag && remark && isBackendStep) {
          
          const prefix = "RETURNED BY "; // ✅ Updated Prefix
          const remarkUpper = remark.toUpperCase();
          const prefixUpper = prefix.toUpperCase();

          if (remarkUpper.startsWith(prefixUpper)) {
            const splitIndex = remark.indexOf(':');
            if (splitIndex !== -1) {
              const returnerName = remark.substring(prefix.length, splitIndex).trim();
              
              // ⛔️ STALE RETURN CHECK ⛔️
              // If "Returned By Backend" exists, it means *we* sent it back. Hide it.
              const invalidReturners = ['BACKEND'];
              
              if (invalidReturners.includes(returnerName.toUpperCase())) {
                 console.log(`VehicleDetails: Stale Return detected from [${returnerName}]. Hiding banner.`);
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
            // Fallback for old format
            this.returnedBy = null; 
            this.returnMessage = remark;
          }
        } else {
          // Hide banner if not red flag or not on this step
          this.returnMessage = null;
          this.returnedBy = null;
        }
      },
      error: (err) => console.error('VehicleDetails: Failed to fetch workflow table', err)
    });
  }

  private fetchVehicleDetails() {
    this.loading = true;
    this.error = null;
    const baseUrl = environment.apiBaseUrl;
    const url = `${baseUrl}/valuations/${this.valuationId}/vehicledetails`;
    const params = new HttpParams()
      .set('vehicleNumber', this.vehicleNumber)
      .set('applicantContact', this.applicantContact);

    this.http
      .get<VehicleDetails>(url, { params, responseType: 'json' })
      .subscribe({
        next: (data) => {
          this.vehicleDetails = data;
          this.loading = false;
          this.checkForDuplicates();
        },
        error: (err: HttpErrorResponse) => {
          this.loading = false;
          if (err.error && err.error.message) {
            this.error = err.error.message;
          } else if (err.status === 404) {
            this.error = 'Vehicle details not found.';
          } else {
            this.error = `Unexpected error (${err.status}): ${err.message}`;
          }
        }
      });
  }

  private checkForDuplicates() {
    if (!this.vehicleDetails) return;
    this.valuationService
      .checkDuplicateVehicle(
        this.vehicleDetails.registrationNumber,
        this.vehicleDetails.engineNumber,
        this.vehicleDetails.chassisNumber
      )
      .subscribe({
        next: (response) => this.duplicateInfo = response,
        error: () => this.duplicateInfo = null
      });
  }

  getDocumentFilePath(type: string): string {
    if (!this.vehicleDetails) {
      return '';
    }
    const doc = this.vehicleDetails.documents.find(d => d.type === type);
    return doc ? doc.filePath : '';
  }

  onEdit(): void {
    this.router.navigate(
      ['valuation', this.valuationId, 'vehicle-details', 'update'],
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
    if (!confirm('Delete this vehicle details?')) return;
    this.valuationService.updateVehicleDetails(
      this.valuationId,
      this.vehicleNumber,
      this.applicantContact,
      { deleted: true }
    ).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => this.error = err.message || 'Delete failed'
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

  canEditVehicleDetails() {
    return this.authz.hasAnyPermission([
      'CanCreateVehicleDetails',
      'CanEditVehicleDetails'
    ]);
  }

  canDeleteVehicleDetails() {
    return this.authz.hasAnyPermission(['CanDeleteVehicleDetails']);
  }

  getCurrentUser(): string {
    try {
      const userJson =
        localStorage.getItem('currentUser') ||
        localStorage.getItem('user') ||
        '{}';
      const user = JSON.parse(userJson);
      return user.name || user.username || user.email || 'User';
    } catch (error) {
      console.error('Error getting current user:', error);
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
  //  RETURN LOGIC (Backend -> Stakeholder)
  // =================================================================

  openReturnModal() {
    this.returnReason = '';
    this.selectedTargetStep = 'Stakeholder'; // Backend usually returns to Stakeholder
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
      "Backend",          // Current Step (Vehicle Details is usually Backend)
      this.returnReason,  // Reason
      currentUserJson.userId || '',
      currentUserJson.name || '',
      this.selectedTargetStep, 
      overrideId
    ).subscribe({
      next: () => {
        alert(`Case Returned Successfully. Sent back to ${this.selectedTargetStep}.`);
        this.closeModals();
        this.onBack();
      },
      error: (err: any) => {
        if (err.status === 400 && err.error?.message?.includes("overrideAssigneeId")) {
          this.showReturnModal = false; 
          this.fetchOverrideUsers(); 
        } else {
          alert("Error: " + (err.error?.message || "Unknown error occurred"));
        }
      }
    });
  }

  fetchOverrideUsers() {
    let roleToFetch = this.selectedTargetStep;
    // Basic mapping if needed, though 'Stakeholder' is usually the role name
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
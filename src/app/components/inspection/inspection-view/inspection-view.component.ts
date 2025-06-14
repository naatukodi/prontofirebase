// src/app/valuation‐inspection/valuation‐inspection.component.ts

import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Inspection } from '../../../models/Inspection';       
import { InspectionService } from '../../../services/inspection.service'; 
import { SharedModule } from '../../shared/shared.module/shared.module'; // Adjust the import path as needed
import { AuthorizationService } from '../../../services/authorization.service'; // Adjust the import path as needed
import { WorkflowButtonsComponent } from '../../workflow-buttons/workflow-buttons.component';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-valuation-inspection',
  standalone: true,
  imports: [SharedModule, WorkflowButtonsComponent, RouterModule],
  templateUrl: './inspection-view.component.html',
  styleUrls: ['./inspection-view.component.scss']
})
export class InspectionViewComponent implements OnInit {
  loading = true;
  error: string | null = null;
  inspection: Inspection | null = null;

  private authz = new AuthorizationService();

  // route param & query params
  valuationId!: string;
  vehicleNumber!: string;
  applicantContact!: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private inspectionService: InspectionService
  ) {}

  ngOnInit(): void {
    // 1) Fetch valuationId from route parameters
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

  private loadQueryParamsAndFetch() {
    // 2) Fetch vehicleNumber & applicantContact from queryParams
    this.route.queryParamMap.subscribe(qp => {
      const vn = qp.get('vehicleNumber');
      const ac = qp.get('applicantContact');
      if (vn && ac) {
        this.vehicleNumber = vn;
        this.applicantContact = ac;
        this.fetchInspection();
      } else {
        this.loading = false;
        this.error = 'Missing required query parameters (vehicleNumber / applicantContact).';
      }
    });
  }

  private fetchInspection() {
    this.loading = true;
    this.error = null;

    // Assuming InspectionService has a getInspection(...) method
    this.inspectionService
      .getInspectionDetails(
      this.valuationId,
      this.vehicleNumber,
      this.applicantContact
      ).subscribe({
      next: data => {
        this.inspection = data;
        this.loading = false;
      },
      error: err => {
        this.error = err.message || 'Failed to load inspection';
        this.loading = false;
      }
      });
  }

  onClick() {
    // Handle the click event for the upload button
    this.router.navigate(['/valuation', this.valuationId, 'inspection','vehicle-image-upload'], {
      queryParams: {
        vehicleNumber: this.vehicleNumber,
        applicantContact: this.applicantContact
      }
    });
  }

  /** Navigate to an edit screen (implement as needed) */
  onEdit() {
    // Navigate to an edit screen for this inspection
    this.router.navigate(
      ['/valuation', this.valuationId, 'inspection', 'update'],
      {
        queryParams: {
          vehicleNumber: this.vehicleNumber,
          applicantContact: this.applicantContact
        }
      }
    );
  }

  /** Delete (or mark deleted) – implement your own logic if needed */
  onDelete(): void {
    if (!confirm('Delete this inspection record?')) return;
    this.inspectionService
      .deleteInspectionDetails(this.valuationId, this.vehicleNumber, this.applicantContact)
      .subscribe({
        next: () => this.router.navigate(['/']),
        error: (err) => (this.error = err.message || 'Delete failed')
      });
  }

  onBack(): void {
    // Navigate back to the previous screen
    this.router.navigate(['/valuation', this.valuationId], {
      queryParams: {
        vehicleNumber: this.vehicleNumber,
        applicantContact: this.applicantContact
      }
    });
  }

  canEditInspection() {
    return this.authz.hasAnyPermission([
      'CanCreateInspection',
      'CanEditInspection'
    ]);
  }
  canDeleteInspection() {
    return this.authz.hasAnyPermission(['CanDeleteInspection']);
  }
}

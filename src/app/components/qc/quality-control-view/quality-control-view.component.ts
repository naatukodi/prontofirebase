// src/app/valuation-quality-control/quality-control-view.component.ts

import { Component, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { QualityControlViewModel } from '../../../models/QualityControlViewModel';
import { QualityControlService } from '../../../services/quality-control.service';
import { forkJoin } from 'rxjs';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module/shared.module';
import { WorkflowButtonsComponent } from '../../workflow-buttons/workflow-buttons.component';
import { AuthorizationService } from '../../../services/authorization.service';


@Component({
  selector: 'app-valuation-quality-control',
  standalone: true,
  imports: [RouterModule, SharedModule, WorkflowButtonsComponent],
  templateUrl: './quality-control-view.component.html',
  styleUrls: ['./quality-control-view.component.scss']
})
export class QualityControlViewComponent implements OnInit {
  loading = true;
  error: string | null = null;

  // Authorization service to check permissions
  private authz = inject(AuthorizationService);

  // Combined view‐model containing both QC data and price‐estimate data
  viewModel: QualityControlViewModel | null = null;

  // route param & query params
  valuationId!: string;
  vehicleNumber!: string;
  applicantContact!: string;
  valuationType!: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private qcService: QualityControlService
  ) {}

  ngOnInit(): void {
    this.valuationType = this.route.snapshot.paramMap.get('valuationType')!;

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
      this.valuationType = qp.get('valuationType')!;
      if (vn && ac) {
        this.vehicleNumber = vn;
        this.applicantContact = ac;
        this.fetchAllData();
      } else {
        this.loading = false;
        this.error = 'Missing required query parameters (vehicleNumber / applicantContact).';
      }
    });
  }

  /**
   * Performs both HTTP calls in parallel:
   *   1) getQualityControlDetails(...)
   *   2) getValuationEstimate(...)
   *
   * Then merges results into `this.viewModel`.
   */
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

    // Use forkJoin to run both requests in parallel
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

  /** Navigate to an edit screen */
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

  /** Delete this quality control record */
  onDelete(): void {
    if (!confirm('Delete this quality control record?')) return;
    this.qcService
      .deleteQualityControlDetails(this.valuationId, this.vehicleNumber, this.applicantContact)
      .subscribe({
        next: () => this.router.navigate(['/']),
        error: (err) => (this.error = err.message || 'Delete failed')
      });
  }

  /** Go back to the valuation overview */
  onBack(): void {
    this.router.navigate(['/valuation', this.valuationId], {
      queryParams: {
        vehicleNumber: this.vehicleNumber,
        applicantContact: this.applicantContact,
        valuationType: this.valuationType
      }
    });
  }

  /** Check if the user has permission to edit this QC record */
  canEditQualityControl() {
    return this.authz.hasAnyPermission([
      'CanCreateQualityControl',
      'CanEditQualityControl'
    ]);
  }
  canDeleteQualityControl() {
    return this.authz.hasAnyPermission(['CanDeleteQualityControl']);
  }
}

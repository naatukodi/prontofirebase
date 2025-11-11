// src/app/components/final-report-view/final-report-view.component.ts

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ValuationService } from '../../../services/valuation.service';
import { ValuationResponseService } from '../../../services/valuation-response.service';
import { FinalReport, PhotoUrls } from '../../../models/final-report.model';
import { environment } from '../../../../environments/environment';
import { HttpParams } from '@angular/common/http';
import { SharedModule } from '../../shared/shared.module/shared.module';
import { WorkflowButtonsComponent } from '../../workflow-buttons/workflow-buttons.component';
import { AuthorizationService } from '../../../services/authorization.service';
import { CommonNotesComponent } from '../../common-notes/common-notes.component';


@Component({
  selector: 'app-final-report-view',
  standalone: true,
  imports: [SharedModule, WorkflowButtonsComponent, CommonNotesComponent],
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
  // Change this from string[] to (keyof PhotoUrls)[]
  photoKeys: (keyof PhotoUrls)[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private valuationService: ValuationService,
    private valuationResponseService: ValuationResponseService,
    private authz: AuthorizationService
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

          // Cast Object.keys(...) to (keyof PhotoUrls)[]
          this.photoKeys = Object.keys(this.report.photoUrls) as (keyof PhotoUrls)[];

          this.loading = false;
        },
        error: (err) => {
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

  // Open in a new tab or trigger download
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

    /** Navigate to an edit screen */
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

  /** Delete this final report */
  onDelete(): void {
    if (!confirm('Delete this final report?')) return;
    this.valuationResponseService
      .deleteValuationResponse(this.valuationId, this.vehicleNumber, this.applicantContact)
      .subscribe({
        next: () => this.router.navigate(['/']),
        error: (err) => (this.error = err.message || 'Delete failed')
      });
  }

  /** Check if the user has permission to edit this QC record */
  canEditFinalReport() {
    return this.authz.hasAnyPermission([
      'CanCreateFinalReport',
      'CanEditFinalReport'
    ]);
  }
  canDeleteFinalReport() {
    return this.authz.hasAnyPermission(['CanDeleteFinalReport']);
  }

  getCurrentUser(): string {
  try {
    const userJson =
      localStorage.getItem('currentUser') ||
      localStorage.getItem('user') ||
      '{}';
    const user = JSON.parse(userJson);
    return user.name || user.username || user.email || 'User';
  } catch {
    return 'User';
  }
}

}

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ClaimService } from '../../services/claim.service';
import { WFValuation } from '../../models/valuation.model';
import { SharedModule } from '../shared/shared.module/shared.module';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    SharedModule,
    RouterModule,
    MatTableModule,
    MatButtonModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  claims: WFValuation[] = [];
  filteredClaims: WFValuation[] = [];
  loading = true;
  error: string | null = null;

  steps = ['Stakeholder', 'BackEnd', 'AVO', 'QC', 'FinalReport'];
  displayedColumns = [
    'vehicleNumber',
    'assignedTo',
    'phone',
    'location',
    'createdAt',
    'age',
    'redFlag',
    'applicant',
    'info',
    'currentStep',
    'status'
  ];

  selectedStep = '';
  stepCounts: Record<string, number> = {};

  constructor(
    private claimService: ClaimService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.claimService.getOpenValuations().subscribe({
      next: data => {
        this.claims = data;
        this.computeStepCounts();
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load valuations';
        this.loading = false;
      }
    });
  }

  private computeStepCounts() {
    this.stepCounts = this.steps.reduce((m, s) => (m[s] = 0, m), {} as any);
    for (let v of this.claims) {
      const key = this.steps[this.getStepIndex(v)] || 'Unknown';
      this.stepCounts[key] = (this.stepCounts[key] || 0) + 1;
    }
  }

  applyFilter() {
    this.filteredClaims = this.selectedStep
      ? this.claims.filter(v => this.steps[this.getStepIndex(v)] === this.selectedStep)
      : this.claims.slice();
  }

  getStepIndex(v: WFValuation): number {
    return Math.max(0, v.workflowStepOrder - 1);
  }

  navigateToCurrent(v: WFValuation) {
    const step = this.steps[this.getStepIndex(v)];
    let route = '';
    switch (step) {
      case 'Stakeholder': route = 'stakeholder'; break;
      case 'BackEnd':     route = 'vehicle-details'; break;
      case 'AVO':         route = 'inspection'; break;
      case 'QC':          route = 'quality-control'; break;
      case 'FinalReport': route = 'final-report'; break;
    }
    this.router.navigate(
      ['/valuation', v.valuationId, route],
      { queryParams: {
          vehicleNumber: v.vehicleNumber,
          applicantContact: v.applicantContact,
          valuationType: v.valuationType
      }}
    );
  }

  ageInDays(v: WFValuation): number {
    const created = new Date(v.createdAt).getTime();
    const diff = Date.now() - created;
    return Math.floor(diff / (1000*60*60*24));
  }
}

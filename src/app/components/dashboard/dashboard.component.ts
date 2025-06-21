import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ClaimService } from '../../services/claim.service';
import { WFValuation } from '../../models/valuation.model';
import { SharedModule } from '../shared/shared.module/shared.module';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [SharedModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  claims: WFValuation[] = [];
  loading = true;
  error: string | null = null;

  // Your workflow steps in order:
  steps = ['Stakeholder', 'BackEnd', 'AVO', 'QC', 'FinalReport'];

  // Columns shown in the table:
  displayedColumns = [
    'vehicleNumber',
    'assignedTo',
    'phone',
    'location',
    'createdAt',
    'status',
    'redFlag',
    'currentStep',
    'applicant',
    'info'
  ];

  constructor(
    private claimService: ClaimService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.claimService.getOpenValuations().subscribe({
      next: data => {
        this.claims = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load valuations';
        this.loading = false;
      }
    });
  }

  /** Convert 1-based workflowStepOrder to a 0-based index */
  getStepIndex(v: WFValuation): number {
    return Math.max(0, v.workflowStepOrder - 1);
  }

  /** Navigate to the route for this valuation’s current step */
  /** Navigate to the route for this valuation’s current step */
navigateToCurrent(v: WFValuation) {
  const idx = this.getStepIndex(v);
  const step = this.steps[idx];
  let stepRoute = '';

  switch (step) {
    case 'Stakeholder':
      stepRoute = 'stakeholder';
      break;
    case 'BackEnd':
      stepRoute = 'vehicle-details';
      break;
    case 'AVO':
      stepRoute = 'inspection';
      break;
    case 'QC':
      stepRoute = 'quality-control';
      break;
    case 'FinalReport':
      stepRoute = 'final-report';
      break;
  }

  // Option A: absolute navigation to /valuation/:id/:step
  this.router.navigate(
    ['/valuation', v.valuationId, stepRoute],
    { queryParams: this.q(v) }
  );
}

private q(v: WFValuation) {
  return {
    vehicleNumber: v.vehicleNumber,
    applicantContact: v.applicantContact
  };
}

}

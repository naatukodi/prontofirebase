// src/app/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ClaimService } from '../../services/claim.service';
import { Valuation, WFValuation } from '../../models/valuation.model';
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

  steps = ['Stakeholder', 'BackEnd', 'AVO', 'QC', 'FinalReport'];

  constructor(
    private claimService: ClaimService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.claimService.getOpenValuations().subscribe({
      next: (data) => {
        this.claims = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load valuations';
        this.loading = false;
      }
    });
  }

  /** The backend’s workflowStepOrder is 1-based; convert to 0-based index */
  getStepIndex(v: WFValuation): number {
    return Math.max(0, v.workflowStepOrder - 1);
  }

  /** Single click handler that routes based on step name */
  onStepClick(step: string, v: WFValuation) {
    // normalize your route paths if needed
    const base = ['/valuation', v.valuationId];
    switch (step) {
      case 'Stakeholder':
        this.router.navigate([...base, 'stakeholder'], { queryParams: this.q(v) });
        break;
      case 'BackEnd':
        this.router.navigate([...base, 'vehicle-details'], { queryParams: this.q(v) });
        break;
      case 'AVO':
        this.router.navigate([...base, 'inspection'], { queryParams: this.q(v) });
        break;
      case 'QC':
        this.router.navigate([...base, 'quality-control'], { queryParams: this.q(v) });
        break;
      case 'FinalReport':
        this.router.navigate([...base, 'final-report'], { queryParams: this.q(v) });
        break;
      default:
        console.warn('Unknown step', step);
    }
  }

  private q(v: WFValuation) {
    return {
      vehicleNumber: v.vehicleNumber,
      applicantContact: v.applicantContact
    };
  }
}

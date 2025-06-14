import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router'; 
import { RouterModule, Routes } from '@angular/router';
import { ClaimService } from '../../services/claim.service';
import { Valuation } from '../../models/valuation.model';

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../shared/shared.module/shared.module';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  imports: [
    RouterModule,
    CommonModule,
    SharedModule,
  ],
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  claims: Valuation[] = [];
  loading = true;
  error: string | null = null;

  // define your five tabs in order:
  steps = [
    'Stakeholder',
    'BackEnd',
    'AVO',
    'QC',
    'FinalReport'
  ];

  constructor(
    private claimService: ClaimService,
    private router: Router  
  ) {}

  ngOnInit(): void {
    this.claimService
      .getOpenValuations()     // ← hit /valuations/open
      .subscribe({
        next: (data: Valuation[]) => {
          this.claims = data;
          this.loading = false;
        },
        error: () => {
          this.error = 'Failed to load valuations';
          this.loading = false;
        }
      });
  }

  /**
   * return the index of the in-progress step
   */
  getStepIndex(v: Valuation): number {
    if (!v.inProgressWorkflow?.length) return 0;
    const role = v.inProgressWorkflow[0].assignedToRole;
    const idx  = this.steps.indexOf(role);
    return idx >= 0 ? idx : 0;
  }

  /** Navigate into the stakeholder view for this valuation */
  goToStakeholder(v: Valuation) {
    this.router.navigate(
      ['/valuations', v.id, 'stakeholder'],
      {
        queryParams: {
          vehicleNumber: v.vehicleNumber,
          applicantContact: v.applicantContact
        }
      }
    );
  }

    /** Navigate to the vehicle details for this valuation */
    goToValuation(v: Valuation) {
      this.router.navigate(
        ['/valuation', v.id, 'vehicle-details'],
        {
          queryParams: {
            vehicleNumber: v.vehicleNumber,
            applicantContact: v.applicantContact
          }
        }
      );
    }
  /** Navigate to the AVO view for this valuation */
    goToInspection(v: Valuation) {
      this.router.navigate(
        ['/valuation', v.id, 'inspection'],
        {
          queryParams: {
            vehicleNumber: v.vehicleNumber,
            applicantContact: v.applicantContact
          }
        }
      );
    }
  /** Navigate to the QC view for this valuation */
  goToQualityControl(v: Valuation) {
    this.router.navigate(
      ['/valuation', v.id, 'quality-control'],
      {
        queryParams: {
          vehicleNumber: v.vehicleNumber,
          applicantContact: v.applicantContact
        }
      }
    );
  }

  /** Navigate to the final report for this valuation */
  goToFinalReport(v: Valuation) {
    this.router.navigate(
      ['/valuation', v.id, 'final-report'],
      {
        queryParams: {
          vehicleNumber: v.vehicleNumber,
          applicantContact: v.applicantContact
        }
      }
    );
  }
}

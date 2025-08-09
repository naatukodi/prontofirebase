import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ClaimService } from '../../services/claim.service';
import { WFValuation } from '../../models/valuation.model';
import { SharedModule } from '../shared/shared.module/shared.module';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { AuthorizationService } from '../../services/authorization.service';
import { AuthService }       from '../../services/auth.service';
import { UsersService } from '../../services/users.service';
import { UserModel } from '../../models/user.model';
import { Observable } from 'rxjs';

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
    'vehicleNumber','assignedTo','phone','location',
    'createdAt','age','redFlag','applicant','info',
    'currentStep','status'
  ];

  private readonly noAssignmentExemptRoles = ['Admin','StateAdmin','SuperAdmin','AVO'];  // ← new

  selectedStep = '';
  stepCounts: Record<string, number> = {};

  constructor(
    private claimService: ClaimService,
    private userService: UsersService,
    private router: Router,
    private authz: AuthorizationService,
    private authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const user = await this.authService.getCurrentUser();      // ← fixed
      if (!user || !user.phoneNumber) {
        this.error = 'Failed to load user details';
        this.loading = false;
        return;
      }
      this.userService.getById(user.phoneNumber).subscribe({
        next: user => this.loadClaimsForUser(user),
        error: () => {
          this.error = 'Failed to load user details';
          this.loading = false;
        }
      });
    } catch (err) {
      this.error = 'Failed to load user details';
      this.loading = false;
    }
  }

  // optional: safe JSON parser (handles string/array/null)
  private parseJsonArray(value: unknown): string[] {                                    // ← new
    if (!value) return [];
    if (Array.isArray(value)) return value as string[];
    if (typeof value === 'string') {
      try { return JSON.parse(value) ?? []; } catch { return []; }
    }
    return [];
  }

    // 4) New helper to branch on role/assignments
  private loadClaimsForUser(user: UserModel) {
    let obs$: Observable<any>;

    if (this.noAssignmentExemptRoles.includes(user.roleId)) {
      obs$ = this.claimService.getOpenValuations();
    } else if (user.roleId === 'AVO') {
      obs$ = this.claimService.getAll(user.userId); // Only valuations assigned to this AVO
    } else {
      const states: string[] = JSON.parse(user.assignedStates || '[]');
      const districts: string[] = JSON.parse(user.assignedDistricts || '[]');

      if (districts.length) {
        obs$ = this.claimService.getByDistricts(districts);
      } else if (states.length) {
        obs$ = this.claimService.getByStates(states);
      } else {
        // No assignments → show nothing
        this.claims = [];
        this.filteredClaims = [];
        this.computeStepCounts();
        this.loading = false;
        return; // Exit before subscribe
      }
    }

    obs$.subscribe({
      next: data => {
        this.claims = data.filter((v: WFValuation) =>
          this.canViewStep(this.steps[this.getStepIndex(v)])
        );
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
    this.stepCounts = this.steps.reduce((m,s)=>(m[s]=0,m), {} as any);
    for (let v of this.claims) {
      const step = this.steps[this.getStepIndex(v)];
      this.stepCounts[step] = (this.stepCounts[step]||0) + 1;
    }
  }

  applyFilter() {
    this.filteredClaims = this.claims.filter(v => {
      const step = this.steps[this.getStepIndex(v)];
      const matchesStep = !this.selectedStep || step === this.selectedStep;
      return matchesStep;
    });
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
    const diff = Date.now() - new Date(v.createdAt).getTime();
    return Math.floor(diff / (1000*60*60*24));
  }

  /** permission checks */
  private canViewStep(step: string): boolean {
    switch (step) {
      case 'Stakeholder': return this.authz.hasAnyPermission(['CanViewStakeholder','CanCreateStakeholder','CanEditStakeholder']);
      case 'BackEnd':     return this.authz.hasAnyPermission(['CanViewVehicleDetails','CanCreateVehicleDetails','CanEditVehicleDetails']);
      case 'AVO':         return this.authz.hasAnyPermission(['CanViewInspection','CanCreateInspection','CanEditInspection']);
      case 'QC':          return this.authz.hasAnyPermission(['CanViewQualityControl','CanCreateQualityControl','CanEditQualityControl']);
      case 'FinalReport': return this.authz.hasAnyPermission(['CanViewFinalReport','CanCreateFinalReport','CanEditFinalReport']);
      default: return false;
    }
  }
}

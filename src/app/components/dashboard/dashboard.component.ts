import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { from, of, EMPTY, Observable } from 'rxjs';
import { catchError, finalize, switchMap, take, timeout } from 'rxjs/operators';

import { ClaimService } from '../../services/claim.service';
import { UsersService } from '../../services/users.service';
import { AuthorizationService } from '../../services/authorization.service';
import { AuthService } from '../../services/auth.service';

import { WFValuation } from '../../models/valuation.model';
import { UserModel } from '../../models/user.model';

import { SharedModule } from '../shared/shared.module/shared.module';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';

// Angular Material and Forms imports
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  // Ensure MatTableModule is present in imports for matRowDefTrackBy to work
  imports: [SharedModule, RouterModule, MatTableModule, MatButtonModule, MatDatepickerModule, MatInputModule, MatNativeDateModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  claims: WFValuation[] = [];
  filteredClaims: WFValuation[] = [];
  loading = true;
  error: string | null = null;
  filterDate: Date | null = null;
  currentUser: UserModel | null = null;

  steps = ['Stakeholder', 'BackEnd', 'AVO', 'QC', 'FinalReport'];
  displayedColumns = [
    'vehicleNumber','assignedTo','phone','location',
    'createdAt','age','redFlag','applicant','info',
    'currentStep','status'
  ];

  private readonly noAssignmentExemptRoles = ['Admin','StateAdmin','SuperAdmin'];
  selectedStep = '';
  stepCounts: Record<string, number> = {};

  constructor(
    private claimService: ClaimService,
    private userService: UsersService,
    private router: Router,
    private authz: AuthorizationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loading = true;

    from(this.authService.getCurrentUser()).pipe(
      // If Firebase auth never resolves, don’t hang the UI forever
      timeout(8000),
      catchError(() => of(null)),
      switchMap((fbUser: any) => {
        if (!fbUser?.phoneNumber) {
          this.error = 'Please sign in to view valuations.';
          // stop further work; finalize() below will flip loading off
          return EMPTY;
        }
        // Fetch your domain user by phone
        return this.userService.getById(fbUser.phoneNumber).pipe(
          take(1),
          catchError(() => {
            this.error = 'Failed to load user details';
            return EMPTY;
          })
        );
      }),
      // With a domain user, fetch valuations based on role/assignment
      switchMap((user: UserModel) => {
        this.currentUser = user;  // Assign logged-in user details
        return this.fetchValuationsForUser(user); })
    )
    .subscribe({
      next: (data: WFValuation[]) => {
        this.claims = (data ?? []).filter(v =>
          this.canViewStep(this.steps[this.getStepIndex(v)])
        );
        // Sort claims by createdAt descending (latest first)
        this.claims.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.computeStepCounts();
        this.applyFilter();
      },
      error: () => { this.error = 'Failed to load valuations'; }
    });
  }
  /**
 * Handles filtering claims when the date picker value changes.
 * Filters the `claims` array to include only those with a createdAt date matching the selected filterDate.
 * Resets the filter if no date is selected.
 */
  onDateFilterChange(): void {
    // If no date is selected, reset filter to show all claims matching other filters.
    if (!this.filterDate) {
      this.applyFilter();
      return;
    }
    // Normalize the filter date to midnight for date-only comparison
    const filterTime = this.filterDate.setHours(0, 0, 0, 0);
    // Filter claims where the createdAt date matches the selected date (ignoring time)
    this.filteredClaims = this.claims.filter(v => {
      const createdTime = new Date(v.createdAt).setHours(0, 0, 0, 0);
      return createdTime === filterTime;
    });
  }

  /** Returns an observable that emits WFValuation[] once and completes */
  private fetchValuationsForUser(user: UserModel): Observable<WFValuation[]> {
    if (user.roleId === 'AVO') {
      // Use the valuations endpoint typed to WFValuation[]
      return this.claimService.getValuationsByAdjusterPhone(user.userId).pipe(take(1));
    }

    if (this.noAssignmentExemptRoles.includes(user.roleId)) {
      return this.claimService.getOpenValuations().pipe(take(1));
    }

    const states = this.parseJsonArray((user as any).assignedStates);
    const districts = this.parseJsonArray((user as any).assignedDistricts);

    if (districts.length) return this.claimService.getByDistricts(districts).pipe(take(1));
    if (states.length)    return this.claimService.getByStates(states).pipe(take(1));

    // No assignments → empty list (still completes)
    return of<WFValuation[]>([]);
  }

  /** Safe JSON parser: accepts array | stringified array | null/undefined */
  private parseJsonArray(value: unknown): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value as string[];
    if (typeof value === 'string') {
      try { return JSON.parse(value) ?? []; } catch { return []; }
    }
    return [];
  }

  private computeStepCounts(): void {
    this.stepCounts = this.steps.reduce((m, s) => (m[s] = 0, m), {} as Record<string, number>);
    for (const v of this.claims) {
      const step = this.steps[this.getStepIndex(v)];
      this.stepCounts[step] = (this.stepCounts[step] || 0) + 1;
    }
  }

  applyFilter(): void {
    this.filteredClaims = this.claims.filter(v => {
      const step = this.steps[this.getStepIndex(v)];
      return !this.selectedStep || step === this.selectedStep && (!this.filterDate || new Date(v.createdAt).setHours(0, 0, 0, 0) === this.filterDate.setHours(0, 0, 0, 0));
    });
  }

  getStepIndex(v: WFValuation): number {
    const idx = (v.workflowStepOrder ?? 1) - 1;
    return Math.min(Math.max(idx, 0), this.steps.length - 1);
  }

  navigateToCurrent(v: WFValuation): void {
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
        }
      }
    );
  }

  ageInDays(v: WFValuation): number {
    const t = v?.createdAt ? new Date(v.createdAt).getTime() : Date.now();
    return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
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

  trackByValuation = (_: number, v: WFValuation) =>
    `${v.valuationId}:${v.vehicleNumber}:${v.applicantContact}`;
}
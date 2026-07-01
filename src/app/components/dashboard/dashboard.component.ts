// src/app/components/dashboard/dashboard.component.ts

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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    SharedModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatDatepickerModule,
    MatInputModule,
    MatNativeDateModule,
    FormsModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  claims: WFValuation[] = [];
  completedCases: WFValuation[] = [];
  filteredClaims: WFValuation[] = [];
  loading = true;
  error: string | null = null;

  fromDate: Date | null = null;
  toDate: Date | null = null;

  currentUser: UserModel | null = null;

  steps = ['Stakeholder', 'BackEnd', 'AVO', 'QC', 'FinalReport', 'Returned'];

  displayedColumns = [
    'vehicleNumber','assignedTo','phone','location',
    'createdAt','age','redFlag','applicant','info',
    'currentStep','status','action'
  ];

  private readonly noAssignmentExemptRoles = ['Admin','StateAdmin','SuperAdmin'];

  private readonly roleStepOrder: Record<string, number> = {
    'Stakeholder': 1,
    'BackEnd': 2,
    'AVO': 3,
    'QC': 4,
    'FinalReport': 5
  };

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

    this.claimService.getCompletedCases().subscribe({
      next: cases => this.completedCases = cases || [],
      error: () => this.completedCases = []
    });

    from(this.authService.getCurrentUser()).pipe(
      timeout(8000),
      catchError(() => of(null)),
      switchMap((fbUser: any) => {
        if (!fbUser?.phoneNumber) {
          this.error = 'Please sign in to view valuations.';
          return EMPTY;
        }

        return this.userService.getById(fbUser.phoneNumber).pipe(
          take(1),
          catchError(() => {
            this.error = 'Failed to load user details';
            return EMPTY;
          })
        );
      }),
      switchMap((user: UserModel) => {
        this.currentUser = user;
        return this.fetchValuationsForUser(user);
      }),
      finalize(() => { this.loading = false; })
    )
    .subscribe({
      next: (data: WFValuation[]) => {
        const all = data || [];

        const stepOrder = this.currentUser
          ? this.roleStepOrder[this.currentUser.roleId]
          : undefined;

        this.claims = stepOrder !== undefined
          ? all.filter(v => v.workflowStepOrder === stepOrder || v.status === 'Returned')
          : all;

        this.claims.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        this.computeStepCounts();
        this.applyFilter();
      },
      error: () => {
        this.error = 'Failed to load valuations';
      }
    });
  }

  private fetchValuationsForUser(user: UserModel): Observable<WFValuation[]> {
    if (this.noAssignmentExemptRoles.includes(user.roleId)) {
      return this.claimService.getOpenValuations().pipe(take(1));
    }

    const states = this.parseJsonArray((user as any).assignedStates);
    const districts = this.parseJsonArray((user as any).assignedDistricts);

    if (districts.length)
      return this.claimService.getByDistricts(districts).pipe(take(1));

    if (states.length)
      return this.claimService.getByStates(states).pipe(take(1));

    return this.claimService.getOpenValuations().pipe(take(1));
  }

  private parseJsonArray(value: unknown): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value as string[];
    if (typeof value === 'string') {
      try { return JSON.parse(value) ?? []; } catch { return []; }
    }
    return [];
  }

  private computeStepCounts(): void {
    this.stepCounts = this.steps.reduce(
      (m, s) => (m[s] = 0, m),
      {} as Record<string, number>
    );

    for (const v of this.claims) {
      if (v.status === 'Returned') {
        this.stepCounts['Returned']++;
      } else {
        const step = this.steps[this.getStepIndex(v)];
        this.stepCounts[step]++;
      }
    }
  }

  applyFilter(): void {
    if (this.selectedStep === 'Complete') {
      this.filteredClaims = this.completedCases;
      return;
    }

    this.filteredClaims = this.claims.filter(v => {

      const stepIndex = this.getStepIndex(v);
      const currentStepName = this.steps[stepIndex];

      let matchesStep = true;

      if (this.selectedStep) {
        if (this.selectedStep === 'Returned') {
          matchesStep = v.status === 'Returned';
        } else {
          matchesStep =
            currentStepName === this.selectedStep &&
            v.status !== 'Returned';
        }
      } else {
        matchesStep = v.status !== 'Returned';
      }

      let matchesDate = true;
      if (this.fromDate && this.toDate) {
        const itemDate = new Date(v.createdAt);
        const start = new Date(this.fromDate);
        start.setHours(0,0,0,0);
        const end = new Date(this.toDate);
        end.setHours(23,59,59,999);
        matchesDate = itemDate >= start && itemDate <= end;
      }

      return matchesStep && matchesDate;
    });
  }

  getStepIndex(v: WFValuation): number {
    const idx = (v.workflowStepOrder ?? 1) - 1;
    return Math.min(Math.max(idx, 0), 4);
  }

  openCase(v: WFValuation) {
    if (this.selectedStep === 'Complete') {
      this.router.navigate(
        ['/valuation', v.valuationId, 'final-report'],
        {
          queryParams: {
            vehicleNumber: v.vehicleNumber,
            applicantContact: v.applicantContact,
            valuationType: v.valuationType
          }
        }
      );
    } else {
      this.navigateToCurrent(v);
    }
  }

  navigateToCurrent(v: WFValuation): void {
    const step = this.steps[this.getStepIndex(v)];
    let route = '';

    switch (step) {
      case 'Stakeholder': route = 'stakeholder'; break;
      case 'BackEnd': route = 'vehicle-details'; break;
      case 'AVO': route = 'inspection'; break;
      case 'QC': route = 'quality-control'; break;
      case 'FinalReport': route = 'final-report'; break;
    }

    this.router.navigate(
      ['/valuation', v.valuationId, route],
      {
        queryParams: {
          vehicleNumber: v.vehicleNumber,
          applicantContact: v.applicantContact,
          valuationType: v.valuationType
        }
      }
    );
  }

  ageInDays(v: WFValuation): number {
    const t = v?.createdAt
      ? new Date(v.createdAt).getTime()
      : Date.now();
    return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
  }

  trackByValuation = (_: number, v: WFValuation) =>
    `${v.valuationId}:${v.vehicleNumber}:${v.applicantContact}`;
}

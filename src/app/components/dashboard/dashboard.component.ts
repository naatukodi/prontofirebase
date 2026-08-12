// src/app/components/dashboard/dashboard.component.ts

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, from, of, EMPTY, Observable } from 'rxjs';
import { catchError, finalize, map, switchMap, take, timeout } from 'rxjs/operators';

import { ClaimService } from '../../services/claim.service';
import { UsersService } from '../../services/users.service';
import { AuthorizationService } from '../../services/authorization.service';
import { AuthService } from '../../services/auth.service';
import { WFValuation, UserDashboardStats } from '../../models/valuation.model';
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
  isAdmin = false;
  userStats: UserDashboardStats | null = null;
  private fbPhone = '';

  steps = ['Stakeholder', 'BackEnd', 'AVO', 'QC', 'FinalReport', 'Returned'];

  displayedColumns = [
    'vehicleNumber','applicant','assignedTo','location',
    'createdAt','age','stage','status','action'
  ];

  // Workflow steps shown in the donut / KPI breakdown (excludes Returned)
  private readonly donutDefs: Array<{ key: string; label: string; color: string }> = [
    { key: 'Stakeholder', label: 'Stakeholder', color: 'var(--stage-stakeholder)' },
    { key: 'BackEnd',     label: 'Backend',     color: 'var(--stage-backend)' },
    { key: 'AVO',         label: 'AVO',         color: 'var(--stage-avo)' },
    { key: 'QC',          label: 'QC',          color: 'var(--stage-qc)' },
    { key: 'FinalReport', label: 'Final Report',color: 'var(--stage-final)' },
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

    from(this.authService.getCurrentUser()).pipe(
      timeout(8000),
      catchError(() => of(null)),
      switchMap((fbUser: any) => {
        if (!fbUser?.phoneNumber) {
          this.error = 'Please sign in to view valuations.';
          return EMPTY;
        }
        this.fbPhone = fbUser.phoneNumber;
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
        this.isAdmin = this.noAssignmentExemptRoles.includes(user.roleId);

        if (this.isAdmin) {
          return forkJoin({
            open: this.fetchValuationsForUser(user).pipe(take(1)),
            completed: this.claimService.getCompletedCases().pipe(
              take(1), catchError(() => of([] as WFValuation[]))
            )
          }).pipe(map(r => ({ admin: true as const, ...r })));
        } else {
          const phone = this.fbPhone || user.phoneNumber || user.userId || '';
          return this.claimService.getUserDashboardStats(phone, user.roleId).pipe(
            take(1),
            catchError(() =>
              this.fetchValuationsForUser(user).pipe(
                take(1),
                catchError(() => of([] as WFValuation[])),
                map(all => {
                  const stepOrder = this.roleStepOrder[user.roleId];
                  const openCases = stepOrder !== undefined
                    ? all.filter(v => v.workflowStepOrder === stepOrder || v.status === 'Returned')
                    : all;
                  return {
                    openCount: openCases.length,
                    agedCount: 0,
                    completedCount: 0,
                    avgTatHours: 0,
                    openCases,
                    completedCases: [] as WFValuation[]
                  } as UserDashboardStats;
                })
              )
            ),
            map(stats => ({ admin: false as const, stats }))
          );
        }
      }),
      finalize(() => { this.loading = false; })
    )
    .subscribe({
      next: (result) => {
        if (result.admin) {
          const all = result.open || [];
          this.completedCases = result.completed || [];

          const stepOrder = this.currentUser
            ? this.roleStepOrder[this.currentUser.roleId]
            : undefined;

          this.claims = stepOrder !== undefined
            ? all.filter(v => v.workflowStepOrder === stepOrder || v.status === 'Returned')
            : all;

          this.claims.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        } else {
          const stats = result.stats;
          this.userStats = stats;
          this.claims = stats.openCases || [];
          this.completedCases = stats.completedCases || [];

          this.claims.sort((a, b) =>
            new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
          );
        }

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
    if (this.selectedStep === 'Complete' || this.selectedStep === 'MyComplete') {
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
    if (this.selectedStep === 'Complete' || this.selectedStep === 'MyComplete') {
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

  ageInHours(v: WFValuation): number {
    const t = v?.updatedAt || v?.createdAt;
    if (!t) return 0;
    return Math.floor((Date.now() - new Date(t).getTime()) / (1000 * 60 * 60));
  }

  ageClass(v: WFValuation): Record<string, boolean> {
    if (this.isAdmin) {
      const d = this.ageInDays(v);
      return { 'age-1': d === 1, 'age-2': d === 2, 'age-3plus': d >= 3 };
    }
    const h = this.ageInHours(v);
    return { 'age-ok': h < 24, 'age-warn': h >= 24 && h < 48, 'age-critical': h >= 48 };
  }

  tatLabel(v: WFValuation): string {
    if (this.isAdmin) {
      return this.ageInDays(v) + 'd';
    }
    return this.ageInHours(v) + 'h';
  }

  trackByValuation = (_: number, v: WFValuation) =>
    `${v.valuationId}:${v.vehicleNumber}:${v.applicantContact}`;

  // ══════════════════════════════════════════════════════════════
  // Dashboard overview widgets (KPIs · donut · trend · today)
  // ══════════════════════════════════════════════════════════════

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  /** Total open cases in the current user's scope. */
  get totalCases(): number { return this.claims.length; }

  /** Open, not returned, not yet at Final Report. */
  get inProgressCount(): number {
    return (this.stepCounts['Stakeholder'] || 0)
         + (this.stepCounts['BackEnd'] || 0)
         + (this.stepCounts['AVO'] || 0)
         + (this.stepCounts['QC'] || 0);
  }
  get finalReportCount(): number { return this.stepCounts['FinalReport'] || 0; }
  get returnedCount(): number { return this.stepCounts['Returned'] || 0; }
  get completeCount(): number { return this.completedCases.length; }

  /** Donut segments with live counts. */
  get donutSegments(): Array<{ key: string; label: string; color: string; value: number }> {
    return this.donutDefs.map(d => ({ ...d, value: this.stepCounts[d.key] || 0 }));
  }

  /** CSS conic-gradient string for the donut ring (falls back to a soft ring when empty). */
  get donutGradient(): string {
    const segs = this.donutSegments;
    const total = segs.reduce((s, x) => s + x.value, 0);
    if (total === 0) return 'conic-gradient(var(--line) 0deg 360deg)';
    let acc = 0;
    const stops: string[] = [];
    for (const s of segs) {
      const start = (acc / total) * 360;
      acc += s.value;
      const end = (acc / total) * 360;
      stops.push(`${s.color} ${start}deg ${end}deg`);
    }
    return `conic-gradient(${stops.join(', ')})`;
  }

  /** Cases created per weekday (Mon→Sun) → SVG geometry for the trend chart. */
  get trend(): {
    labels: string[];
    max: number;
    linePoints: string;
    areaPoints: string;
    dots: Array<{ x: number; y: number; v: number }>;
  } {
    const dayCounts = new Array(7).fill(0); // 0=Sun..6=Sat
    for (const v of this.claims) {
      if (!v.createdAt) continue;
      const d = new Date(v.createdAt);
      if (isNaN(d.getTime())) continue;
      dayCounts[d.getDay()]++;
    }
    const order = [1, 2, 3, 4, 5, 6, 0];
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const labels = order.map(i => names[i]);
    const values = order.map(i => dayCounts[i]);

    const W = 700, H = 200, padX = 20, padY = 24;
    const max = Math.max(1, ...values);
    const step = (W - padX * 2) / (values.length - 1);
    const dots = values.map((v, i) => ({
      x: padX + i * step,
      y: H - padY - (v / max) * (H - padY * 2),
      v,
    }));
    const linePoints = dots.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const areaPoints =
      `${padX},${H - padY} ` + linePoints + ` ${W - padX},${H - padY}`;
    return { labels, max, linePoints, areaPoints, dots };
  }

  /** Percentage change in case volume vs the previous 7 days (for the trend header). */
  get weekTrendPct(): number {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    let thisWeek = 0, lastWeek = 0;
    for (const v of this.claims) {
      if (!v.createdAt) continue;
      const t = new Date(v.createdAt).getTime();
      if (isNaN(t)) continue;
      const age = now - t;
      if (age <= 7 * day) thisWeek++;
      else if (age <= 14 * day) lastWeek++;
    }
    if (lastWeek === 0) return thisWeek > 0 ? 100 : 0;
    return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
  }

  /** Cases created or updated today — powers the "Today's cases" panel. */
  get todaysCases(): WFValuation[] {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date();   end.setHours(23, 59, 59, 999);
    return this.claims
      .filter(v => {
        const t = v.updatedAt || v.createdAt;
        if (!t) return false;
        const d = new Date(t);
        return !isNaN(d.getTime()) && d >= start && d <= end;
      })
      .slice(0, 6);
  }

  stepName(v: WFValuation): string {
    if (v.status === 'Returned') return 'Returned';
    return this.steps[this.getStepIndex(v)] || '';
  }

  initials(name?: string | null): string {
    if (!name) return '—';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '—';
    const two = (parts[0][0] || '') + (parts[1]?.[0] || '');
    return two.toUpperCase();
  }
}

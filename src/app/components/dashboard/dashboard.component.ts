// src/app/components/dashboard/dashboard.component.ts

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, from, of, EMPTY, Observable, Subject } from 'rxjs';
import { catchError, finalize, map, switchMap, take, timeout, debounceTime, distinctUntilChanged } from 'rxjs/operators';

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
  /**
   * How long a completed case stays on the dashboard after approval.
   *
   * A display rule only: the case is untouched and the search still finds it, which
   * is why search had to move to the server — these rows are no longer loaded here.
   */
  private static readonly COMPLETED_VISIBLE_DAYS = 30;
  filteredClaims: WFValuation[] = [];
  loading = true;
  error: string | null = null;

  /** Free-text filter over vehicle number, applicant and stakeholder. */
  searchTerm = '';
  /** Rows returned by the server search, or null when the box is not driving the table. */
  searchResults: WFValuation[] | null = null;
  searching = false;
  searchNotice: string | null = null;
  private searchInput$ = new Subject<string>();
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
    // Debounced so a search does not fire a query per keystroke.
    this.searchInput$
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(term => this.runServerSearch(term));

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
          this.completedCases = this.withinCompletedWindow(result.completed || []);

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
          this.completedCases = this.withinCompletedWindow(stats.completedCases || []);

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

  /** True when the row matches the current search box, which may be empty. */
  private matchesSearch(v: WFValuation): boolean {
    const q = this.searchTerm.trim().toLowerCase();
    if (!q) return true;
    return [v.vehicleNumber, v.applicantName, v.name, v.assignedTo]
      .some(f => (f || '').toLowerCase().includes(q));
  }

  /**
   * Keeps only completed cases approved within the visible window.
   *
   * Older ones are still in the system and still searchable; they just stop crowding
   * a dashboard that is meant to show what is live.
   */
  private withinCompletedWindow(rows: WFValuation[]): WFValuation[] {
    const cutoff = Date.now() - DashboardComponent.COMPLETED_VISIBLE_DAYS * 24 * 60 * 60 * 1000;
    return (rows || []).filter(v => {
      const t = v.completedAt || v.updatedAt || v.createdAt;
      if (!t) return true;                       // no date: keep rather than hide
      const d = new Date(t).getTime();
      return isNaN(d) ? true : d >= cutoff;
    });
  }

  /** Minimum term the server search accepts; below this the local filter is used. */
  private static readonly MIN_SERVER_SEARCH = 3;

  /**
   * Runs the search box.
   *
   * Short terms filter the rows already on screen, which is instant. Anything longer
   * goes to the server, because chassis and engine numbers are not on these rows and
   * completed cases past the window are not loaded at all.
   */
  onSearchChanged(term: string): void {
    this.searchTerm = term;
    this.searchInput$.next(term);
  }

  private runServerSearch(term: string): void {
    const q = (term || '').trim();
    if (q.length < DashboardComponent.MIN_SERVER_SEARCH) {
      this.searchResults = null;
      this.searching = false;
      this.searchNotice = null;
      this.applyFilter();
      return;
    }

    this.searching = true;
    this.searchNotice = null;
    this.claimService.searchCases(q).subscribe(rows => {
      this.searching = false;
      this.searchResults = rows;
      this.searchNotice = rows.length === 0
        ? `No case matches "${q}" by reference, vehicle, chassis or engine number.`
        : null;
      this.applyFilter();
    });
  }

  applyFilter(): void {
    // A server search answers across every case, closed and archived included, so it
    // replaces the local list rather than being filtered by it.
    if (this.searchResults !== null) {
      this.filteredClaims = this.searchResults;
      return;
    }

    if (this.selectedStep === 'Complete' || this.selectedStep === 'MyComplete') {
      this.filteredClaims = this.completedCases.filter(v => this.matchesSearch(v));
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

      return matchesStep && matchesDate && this.matchesSearch(v);
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
  // Dashboard overview widgets (KPIs · donut · today)
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

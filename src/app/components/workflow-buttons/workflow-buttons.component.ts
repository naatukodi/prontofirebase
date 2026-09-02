// src/app/shared/workflow-buttons/workflow-buttons.component.ts

import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Component, Input, inject, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, switchMap, take } from 'rxjs/operators';
import { AuthorizationService } from '../../services/authorization.service';
import { WorkflowService } from '../../services/workflow.service';
import { WorkflowTable } from '../../models/WorkflowTable';
import { SharedModule } from '../shared/shared.module/shared.module';
import { UserModel } from '../../models/user.model';
import { UsersService } from '../../services/users.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CommonNotesComponent } from '../common-notes/common-notes.component';
import { CaseHistoryComponent } from '../case-history/case-history.component';
import { CasePaymentComponent } from '../case-payment/case-payment.component';
import { AuthService } from '../../services/auth.service';
import { ValuationService } from '../../services/valuation.service';
import { VehicleDuplicateCheckResponse } from '../../models/vehicle-duplicate-check.interface';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DuplicateDialogComponent } from '../duplicate-dialog/duplicate-dialog.component';

@Component({
  selector: 'app-workflow-buttons',
  templateUrl: './workflow-buttons.component.html',
  styleUrls: ['./workflow-buttons.component.scss'],
  imports: [
    CommonModule,
    RouterModule,
    SharedModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  standalone: true
})
export class WorkflowButtonsComponent {

  @Input() id!: string;
  @Input() vehicleNumber!: string;
  @Input() applicantContact!: string;
  @Input() valuationType!: string;

  public table?: WorkflowTable;
  public loadingTable = false;
  public tableError: string | null = null;
  assignedUser?: UserModel;
  error?: string;
  loadingAssigned = false;

  currentUserName: string = '';

  // ── Workflow tracker ─────────────────────────────────────────────────────
  /**
   * The five stages, always shown in order. A stage the user has no permission
   * for is still listed — the point is to show where the case stands — but it
   * is not clickable.
   */
  readonly workflowSteps: { order: number; label: string; route: string; can: () => boolean }[] = [
    { order: 1, label: 'Stake Holder', route: 'stakeholder',     can: () => this.canViewStakeholder() },
    { order: 2, label: 'Backend',      route: 'vehicle-details', can: () => this.canViewVehicleDetails() },
    { order: 3, label: 'AVO',          route: 'inspection',      can: () => this.canViewInspection() },
    { order: 4, label: 'QC',           route: 'quality-control', can: () => this.canViewQualityControl() },
    { order: 5, label: 'Final Report', route: 'final-report',    can: () => this.canViewFinalReport() },
  ];

  /** Query params every stage link carries. */
  get stepQueryParams() {
    return {
      vehicleNumber: this.vehicleNumber,
      applicantContact: this.applicantContact,
      valuationType: this.valuationType
    };
  }

  private get caseStatus(): string {
    return (this.table?.status || '').trim().toLowerCase();
  }

  get isCaseComplete(): boolean {
    return this.caseStatus === 'completed';
  }

  /** A returned case sits back at an earlier stage and needs flagging as such. */
  get isCaseReturned(): boolean {
    return this.caseStatus === 'returned';
  }

  /** Colours the status chip: done, needs attention, or still moving. */
  get statusTone(): 'done' | 'warn' | 'active' {
    if (this.isCaseComplete) return 'done';
    if (this.isCaseReturned || this.caseStatus === 'rejected') return 'warn';
    return 'active';
  }

  /**
   * Where each stage stands: everything before the current step is done, the
   * current step is in progress, everything after is still to come. A completed
   * case shows all five as done.
   */
  stepState(order: number): 'done' | 'current' | 'todo' {
    if (this.isCaseComplete) return 'done';
    const current = this.table?.workflowStepOrder ?? 0;
    if (!current) return 'todo';
    if (order < current) return 'done';
    if (order === current) return 'current';
    return 'todo';
  }

  // ── Toolbar status badges ────────────────────────────────────────────────
  /** What the case has on file for payment. "Pending" until something is saved. */
  paymentBadge: { label: string; tone: 'paid' | 'pending' } = { label: 'Pending', tone: 'pending' };
  paymentBadgeLoading = true;

  /** Duplicate count. null while the check is still running. */
  dedupeCount: number | null = null;
  dedupeLoading = true;
  /** Cached so opening the dialog does not repeat the two calls. */
  private dedupeResult: VehicleDuplicateCheckResponse | null = null;

  get dedupeLabel(): string {
    if (this.dedupeLoading || this.dedupeCount === null) return 'Dedupe';
    if (this.dedupeCount === 0) return 'Dedupe — no matches';
    return `Dedupe — ${this.dedupeCount} match${this.dedupeCount === 1 ? '' : 'es'}`;
  }

  private authz = inject(AuthorizationService);
  private cdr = inject(ChangeDetectorRef);

  constructor(
    private tableSvc: WorkflowService,
    private usersSvc: UsersService,
    private dialog: MatDialog,
    private authService: AuthService,
    private valuationService: ValuationService,
    private snackBar: MatSnackBar
  ) {}

  async ngOnInit(): Promise<void> {
    this.loadAssignedUser();
    this.loadPaymentBadge();
    this.loadDedupeBadge();

    const user = await this.authService.getCurrentUser();
    this.currentUserName =
      user?.displayName ||
      user?.phoneNumber ||
      user?.email ||
      'Unknown';
  }

  private loadAssignedUser() {
    this.loadingAssigned = true;
    this.usersSvc
      .getAssignedUser(this.id, this.vehicleNumber, this.applicantContact)
      .subscribe({
        next: user => {
          this.assignedUser = user;
          this.loadingAssigned = false;
        },
        error: err => {
          this.error = err.message || 'Failed to load assigned user';
          this.loadingAssigned = false;
        }
      });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['id'] || changes['vehicleNumber'] || changes['applicantContact']) {
      this.loadingTable = true;

      this.tableSvc.getTable(this.id, this.vehicleNumber, this.applicantContact)
        .subscribe({
          next: (table) => {
            this.table = table;
            this.loadingTable = false;
          },
          error: () => {
            this.tableError = 'Failed to load table';
            this.loadingTable = false;
          }
        });
    }
  }

  // ================= STATUS BADGES =================

  /**
   * Payment badge. Nothing saved on the case reads as "Pending"; a saved record
   * shows its own status, so a payment deliberately saved as Pending or Credit
   * is never displayed as Paid.
   */
  private loadPaymentBadge(): void {
    this.paymentBadgeLoading = true;
    this.tableSvc.getPayment(this.id)
      .pipe(take(1), catchError(() => of(null)))
      .subscribe(payment => {
        const status = (payment?.paymentStatus || '').trim();
        if (!status) {
          this.paymentBadge = { label: 'Pending', tone: 'pending' };
        } else if (status.toLowerCase() === 'completed') {
          this.paymentBadge = { label: 'Paid', tone: 'paid' };
        } else {
          this.paymentBadge = { label: status, tone: 'pending' };
        }
        this.paymentBadgeLoading = false;
        this.cdr.detectChanges();
      });
  }

  private loadDedupeBadge(): void {
    this.dedupeLoading = true;
    this.runDuplicateCheck().subscribe(response => {
      this.dedupeResult = response;
      this.dedupeCount = response?.totalDuplicatesFound ?? 0;
      this.dedupeLoading = false;
      this.cdr.detectChanges();
    });
  }

  // ================= DUPLICATE CHECK =================

  /**
   * One call: the server reads engine and chassis off the case, runs the check,
   * and records the outcome so the printed report can state it. This used to be
   * two requests here — fetch details, then check — and the answer was discarded.
   */
  private runDuplicateCheck(): Observable<VehicleDuplicateCheckResponse | null> {
    return this.valuationService
      .runCaseDedupe(this.id, this.vehicleNumber, this.applicantContact)
      .pipe(take(1), catchError(() => of(null)));
  }

  checkDuplicates() {
    const open = (response: VehicleDuplicateCheckResponse) =>
      this.dialog.open(DuplicateDialogComponent, {
        width: '950px',
        maxHeight: '90vh',
        data: response
      });

    // The badge already ran this on load — reuse it rather than paying twice.
    if (this.dedupeResult) { open(this.dedupeResult); return; }

    this.runDuplicateCheck().subscribe(response => {
      if (!response) return;
      this.dedupeResult = response;
      this.dedupeCount = response.totalDuplicatesFound ?? 0;
      this.dedupeLoading = false;
      this.cdr.detectChanges();
      open(response);
    });
  }

  // ================= POPUPS =================

  openNotesPopup(): void {
    const dialogRef = this.dialog.open(CommonNotesComponent, {
      width: '800px',
      maxHeight: '90vh'
    });

    dialogRef.componentInstance.entityType = 'Valuation';
    dialogRef.componentInstance.entityId = this.id;
    dialogRef.componentInstance.currentUser = this.currentUserName;
  }

  openHistoryPopup(): void {
    this.dialog.open(CaseHistoryComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: {
        valuationId: this.id
      }
    });
  }

  openPaymentPopup(): void {
    const ref = this.dialog.open(CasePaymentComponent, {
      width: '640px',
      maxWidth: 'calc(100vw - 32px)',
      maxHeight: '86vh',
      // Strips MatDialog's own surface padding so the dialog's head and foot
      // bands reach the panel edges — see styles.css.
      panelClass: 'payment-dialog-panel',
      data: {
        valuationId: this.id,
        vehicleNumber: this.vehicleNumber,
        applicantContact: this.applicantContact,
        table: this.table,
        currentUserName: this.currentUserName
      }
    });

    // Re-read the badge after the dialog closes so a payment just saved shows
    // up immediately, without a page refresh.
    ref.afterClosed().pipe(take(1)).subscribe(() => this.loadPaymentBadge());
  }

  // ================= PERMISSIONS =================

  canViewStakeholder() {
    return this.authz.hasAnyPermission([
      'CanViewStakeholder',
      'CanCreateStakeholder',
      'CanEditStakeholder'
    ]);
  }

  canViewVehicleDetails() {
    return this.authz.hasAnyPermission([
      'CanViewVehicleDetails',
      'CanCreateVehicleDetails',
      'CanEditVehicleDetails'
    ]);
  }

  canViewInspection() {
    return this.authz.hasAnyPermission([
      'CanViewInspection',
      'CanCreateInspection',
      'CanEditInspection'
    ]);
  }

  canViewQualityControl() {
    return this.authz.hasAnyPermission([
      'CanViewQualityControl',
      'CanCreateQualityControl',
      'CanEditQualityControl'
    ]);
  }

  canViewFinalReport() {
    return this.authz.hasAnyPermission([
      'CanViewFinalReport',
      'CanCreateFinalReport',
      'CanEditFinalReport'
    ]);
  }

  canAccessPayment() {
    return this.authz.hasAnyPermission([
      'CanViewInspection', 'CanCreateInspection', 'CanEditInspection',
      'CanViewQualityControl', 'CanCreateQualityControl', 'CanEditQualityControl',
      'CanViewFinalReport', 'CanCreateFinalReport', 'CanEditFinalReport'
    ]);
  }

  canViewCaseActions() {
    return this.authz.hasAnyPermission([
      'CanViewVehicleDetails', 'CanCreateVehicleDetails', 'CanEditVehicleDetails',
      'CanViewInspection', 'CanCreateInspection', 'CanEditInspection',
      'CanViewQualityControl', 'CanCreateQualityControl', 'CanEditQualityControl',
      'CanViewFinalReport', 'CanCreateFinalReport', 'CanEditFinalReport'
    ]);
  }
}
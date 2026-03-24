// src/app/shared/workflow-buttons/workflow-buttons.component.ts

import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Component, Input, inject, SimpleChanges } from '@angular/core';
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

  private authz = inject(AuthorizationService);

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

  // ================= DUPLICATE CHECK =================

  checkDuplicates() {

    // First get vehicle details to fetch engine & chassis
    this.valuationService.getVehicleDetails(
      this.id,
      this.vehicleNumber,
      this.applicantContact
    ).subscribe(details => {

      const engineNumber = details?.engineNumber || '';
      const chassisNumber = details?.chassisNumber || '';

      // Now call duplicate API with ALL fields
      this.valuationService.checkDuplicateVehicle(
        this.vehicleNumber,
        engineNumber,
        chassisNumber
      ).subscribe(response => {

        this.dialog.open(DuplicateDialogComponent, {
          width: '950px',
          maxHeight: '90vh',
          data: response
        });

      });

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
    this.dialog.open(CasePaymentComponent, {
      width: '600px',
      maxHeight: '90vh',
      data: {
        valuationId: this.id,
        vehicleNumber: this.vehicleNumber,
        applicantContact: this.applicantContact,
        table: this.table
      }
    });
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
}
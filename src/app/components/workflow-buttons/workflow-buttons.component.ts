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


@Component({
  selector: 'app-workflow-buttons',
  templateUrl: './workflow-buttons.component.html',
  styleUrls: ['./workflow-buttons.component.scss'],
  imports: [
    CommonModule,
    RouterModule,
    SharedModule,
    MatDialogModule
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

  constructor(
    private tableSvc: WorkflowService,
    private usersSvc: UsersService,
    private dialog: MatDialog,
    private authService: AuthService
  ) {}

  private authz = inject(AuthorizationService);

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

  // 🔹 Open Common Notes Popup
  openNotesPopup(): void {
    const dialogRef = this.dialog.open(CommonNotesComponent, {
      width: '800px',
      maxHeight: '90vh'
    });

    dialogRef.componentInstance.entityType = 'Valuation';
    dialogRef.componentInstance.entityId = this.id;
    dialogRef.componentInstance.currentUser = this.currentUserName;
  }

  // 🔹 Open Case History Popup
  openHistoryPopup(): void {
    this.dialog.open(CaseHistoryComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: {
        valuationId: this.id
      }
    });
  }

  // 🔹 Open Payment Popup
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

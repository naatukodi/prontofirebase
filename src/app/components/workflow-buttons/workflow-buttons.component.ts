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

@Component({
  selector: 'app-workflow-buttons',
  templateUrl: './workflow-buttons.component.html',
  styleUrls: ['./workflow-buttons.component.scss'],
  imports: [CommonModule, RouterModule, SharedModule],
  standalone: true
})
export class WorkflowButtonsComponent {
  /**
   * `id` is the Valuation ID (route param).
   * `vehicleNumber` and `applicantContact` are passed as query params.
   */
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

  constructor(
    private tableSvc: WorkflowService,
    private usersSvc: UsersService
  ) { }

  private authz = inject(AuthorizationService);

  ngOnInit(): void {
    // after you have valuationId, vehicleNumber, applicantContact:
    this.loadAssignedUser();
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
    // whenever inputs change, re-fetch
    if (changes['id'] || changes['vehicleNumber'] || changes['applicantContact']) {
      this.tableSvc.getTable(this.id, this.vehicleNumber, this.applicantContact)
        .subscribe({
          next: (table) => {
            this.table = table;
            this.loadingTable = false;
          },
          error: (err) => {
            this.tableError = 'Failed to load table';
            this.loadingTable = false;
          }
        });
    }
  }
  

  // check any of these three
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

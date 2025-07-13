// src/app/shared/workflow-buttons/workflow-buttons.component.ts
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Component, Input, inject, SimpleChanges } from '@angular/core';
import { AuthorizationService } from '../../services/authorization.service';
import { WorkflowService } from '../../services/workflow.service';
import { WorkflowTable } from '../../models/WorkflowTable';
import { SharedModule } from '../shared/shared.module/shared.module';

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

  constructor(
    private tableSvc: WorkflowService
  ) { }

  private authz = inject(AuthorizationService);

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

// src/app/shared/workflow-buttons/workflow-buttons.component.ts
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Component, Input, inject } from '@angular/core';
import { AuthorizationService } from '../../services/authorization.service';

@Component({
  selector: 'app-workflow-buttons',
  templateUrl: './workflow-buttons.component.html',
  styleUrls: ['./workflow-buttons.component.scss'],
  imports: [CommonModule, RouterModule],
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

  constructor() { }

  private authz = inject(AuthorizationService);

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

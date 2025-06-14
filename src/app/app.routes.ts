import { Routes } from '@angular/router';
import { Test } from './test/test';
import { Test1 } from './test1/test1';
import { MainLayoutComponent } from './components/main-layout/main-layout';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { StakeholderNewComponent } from './components/stakeholder/stakeholder-new/stakeholder-new.component';
import { StakeholderUpdateComponent } from './components/stakeholder/stakeholder-update/stakeholder-update.component';
import { StakeholderViewComponent } from './components/stakeholder/stakeholder-view/stakeholder-view.component';
import { ValuationVehicleDetailsComponent } from './components/valution/valuation-vehicle-details/valuation-vehicle-details.component';
import { ValuationUpdateComponent } from './components/valution/valuation-update/valuation-update.component';

import { Unauthorized } from './unauthorized/unauthorized';
import { LoginComponent } from './login/login';
import { AuthGuard } from './auth/auth';
import { RoleGuard }      from './auth/role.guard';

export const routes: Routes = [
   // Public (no header/hero/footer)
  {
    path: 'login',
    component: LoginComponent
  },
   {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],    // optional if you want root protected
    children: [
    // 1) default: hit “/” → redirect to /dashboard
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard, RoleGuard], data: { permission: 'CanViewDashboard' } },
  // 2) Stakeholder routes
  { path: 'stakeholder', component: StakeholderNewComponent, canActivate: [AuthGuard, RoleGuard], data: { permission: 'CanCreateStakeholder' } },
  { path: 'valuations/:valuationId/stakeholder/update', component: StakeholderUpdateComponent, canActivate: [AuthGuard, RoleGuard], data: { permission: 'CanEditStakeholder' } },
  { path: 'valuations/:valuationId/stakeholder', component: StakeholderViewComponent, canActivate: [AuthGuard, RoleGuard], data: { permission: 'CanViewStakeholder' } },
  // 3) Valuation routes
  { path: 'valuation/:valuationId/vehicle-details', component: ValuationVehicleDetailsComponent, canActivate: [AuthGuard, RoleGuard], data: { permission: 'CanViewVehicleDetails' } },
  { path: 'valuation/:valuationId/vehicle-details/update', component: ValuationUpdateComponent, canActivate: [AuthGuard, RoleGuard], data: { permission: 'CanEditVehicleDetails' } },
  { path: 'test', component: Test, canActivate: [AuthGuard, RoleGuard], data: { permission: 'CanViewTest' } },
  { path: 'test1', component: Test1, canActivate: [AuthGuard, RoleGuard], data: { permission: 'CanViewTest1' } },
  { path: 'unauthorized', component: Unauthorized },
   ]
  },
  { path: '**', redirectTo: '' }
];

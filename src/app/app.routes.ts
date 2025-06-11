import { Routes } from '@angular/router';
import { Test } from './test/test';
import { Test1 } from './test1/test1';
import { Unauthorized } from './unauthorized/unauthorized';
import { LoginComponent } from './login/login';
import { AuthGuard } from './auth/auth';
import { RoleGuard }      from './auth/role.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'test', component: Test, canActivate: [AuthGuard, RoleGuard] },
  { path: 'test1', component: Test1, canActivate: [AuthGuard, RoleGuard], data: { permission: 'test1' } },
  { path: 'unauthorized', component: Unauthorized },
  { path: '**', redirectTo: '' }
];

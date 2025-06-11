// src/app/role.guard.ts
import { Injectable, inject } from '@angular/core';
import {
  CanActivate, ActivatedRouteSnapshot, Router
} from '@angular/router';
import { AuthorizationService } from '../services/authorization.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  private authz = inject(AuthorizationService);
  private router = inject(Router);

  async canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {
  const perm = route.data['permission'] as string;
  const roles = await this.authz.loadPermissions();
  
  console.log('🛡 RoleGuard checking for', perm, 'against', roles);
  if (roles.includes(perm)) {
    return true;
  } else {
    this.router.navigate(['/unauthorized']);
    return false;
  }
}
}

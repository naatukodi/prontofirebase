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
    await this.authz.loadPermissions();
    if (this.authz.hasPermission(perm)) {
      return true;
    }
    // Optionally navigate to a “not authorized” page
    this.router.navigate(['/unauthorized']);
    return false;
  }
}

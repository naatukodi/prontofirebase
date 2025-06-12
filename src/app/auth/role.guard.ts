// src/app/role.guard.ts
import { Injectable, inject } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  Router
} from '@angular/router';
import { AuthorizationService } from '../services/authorization.service';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  private authz = inject(AuthorizationService);
  private authSvc = inject(AuthService);
  private router = inject(Router);

  async canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {
    // ensure we have a user
    const user = await this.authSvc.getCurrentUser();
    if (!user) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: route.pathFromRoot.map(r => r.url.map(seg=>seg.path).join('/')).join('/') }
      });
      return false;
    }

    const requiredPerm = route.data['permission'] as string;
    const roles = await this.authz.loadPermissions();
    console.log('🛡 RoleGuard needs', requiredPerm, '– user has', roles);

    if (roles.includes(requiredPerm)) {
      return true;
    }

    this.router.navigate(['/unauthorized']);
    return false;
  }
}

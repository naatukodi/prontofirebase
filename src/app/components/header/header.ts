import { Component, ViewChild, inject } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { BreakpointObserver } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../shared/shared.module/shared.module';

import { Auth, authState, User } from '@angular/fire/auth';
import { Observable, of } from 'rxjs';
import { map, switchMap, shareReplay } from 'rxjs/operators';

import { AuthService } from '../../services/auth.service';
import { AuthorizationService } from '../../services/authorization.service';
import { UsersService } from '../../services/users.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SharedModule
  ],
  templateUrl: './header.html',
  styleUrls: ['./header.css']
})
export class HeaderComponent {
  @ViewChild('drawer') drawer!: MatSidenav;

  private bp = inject(BreakpointObserver);
  private auth = inject(Auth);
  private usersSvc = inject(UsersService);

  authSvc = inject(AuthService);
  authzSvc1 = inject(AuthorizationService);

  isHandset$: Observable<boolean> = this.bp
    .observe(['(max-width: 768px)'])
    .pipe(map(r => r.matches));

  /** Firebase auth user */
  user$: Observable<User | null> = authState(this.auth);

  /** Display name from API or Firebase fallback */
  userName$: Observable<string> = this.user$.pipe(
    switchMap(u => {
      if (!u) return of('');
      const id = this.resolveId(u);
      if (!id) return of(this.fallbackName(u));
      return this.usersSvc.getById(id).pipe(
        map(m => (m?.name?.trim() || this.fallbackName(u)))
      );
    }),
    shareReplay(1)
  );

  /** Roles from backend */
  roles$: Observable<string[]> = this.user$.pipe(
    switchMap(u => {
      if (!u) return of<string[]>([]);
      const phone = u.phoneNumber ?? '';
      return phone ? this.usersSvc.getRoles(phone) : of<string[]>([]);
    }),
    shareReplay(1)
  );

  /** Derived flags */
  isAdmin$: Observable<boolean> = this.roles$.pipe(
    map(roles => roles.includes('Admin')),
    shareReplay(1)
  );

  canEditStakeholder$: Observable<boolean> = this.roles$.pipe(
    map(roles => roles.includes('CanEditStakeholder')),
    shareReplay(1)
  );

  onLogout(): void {
    this.authSvc.logout();
    this.authzSvc1.clearPermissions();
  }

  /** Prefer phoneNumber, then uid, then email */
  private resolveId(u: User): string | null {
    return u.phoneNumber ?? u.uid ?? u.email ?? null;
  }

  private fallbackName(u: User): string {
    return u.displayName || u.email || u.phoneNumber || '';
  }
}

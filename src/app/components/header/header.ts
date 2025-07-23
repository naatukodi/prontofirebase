import { Component, ViewChild, inject } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { BreakpointObserver } from '@angular/cdk/layout';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';

import { AuthService } from '../../services/auth.service';
import { AuthorizationService } from '../../services/authorization.service';

import { Auth, authState, User } from '@angular/fire/auth';
import { UsersService } from '../../services/users.service';

import { Observable, of } from 'rxjs';
import { map, switchMap, shareReplay } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    // Material (kept because you might still use Mat-sidenav / icons)
    MatToolbarModule,
    MatSidenavModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatListModule
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

  /** Firebase user observable */
  user$: Observable<User | null> = authState(this.auth);

  /**
   * Resolved display name from your API:
   * - Uses phoneNumber or uid/email to call getById()
   * - Falls back to Firebase displayName/email if API has nothing
   */
  userName$: Observable<string> = this.user$.pipe(
    switchMap(u => {
      if (!u) return of('');
      const id = this.resolveId(u);
      if (!id) {
        // fall back directly
        return of(this.fallbackName(u));
      }
      return this.usersSvc.getById(id).pipe(
        map(model => (model?.name?.trim() || this.fallbackName(u)))
      );
    }),
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

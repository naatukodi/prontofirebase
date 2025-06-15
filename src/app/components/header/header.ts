// src/app/header.component.ts
import { Component, inject, ViewChild } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule, MatSidenav }       from '@angular/material/sidenav';
import { MatButtonModule }  from '@angular/material/button';
import { MatIconModule }    from '@angular/material/icon';
import { MatMenuModule }    from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { BreakpointObserver }     from '@angular/cdk/layout';
import { RouterModule }     from '@angular/router';
import { AuthService }      from '../../services/auth.service';
import { AuthorizationService } from '../../services/authorization.service';
import { Auth, authState, User } from '@angular/fire/auth';
import { Observable, map }       from 'rxjs';
import { MatListModule } from '@angular/material/list';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatDividerModule, RouterModule, MatSidenavModule, MatListModule, CommonModule],
  templateUrl: './header.html',
  styleUrls: ['./header.css']
})
export class HeaderComponent {
  @ViewChild('drawer') drawer!: MatSidenav;
  private bp = inject(BreakpointObserver);
  isHandset$: Observable<boolean> = this.bp
    .observe(['(max-width: 768px)'])
    .pipe(map(r => r.matches));
  authSvc = inject(AuthService);
  user$: Observable<User | null> = authState(inject(Auth));
  authzSvc1 = inject(AuthorizationService);

  onLogout(): void {
    this.authSvc.logout();
    this.authzSvc1.clearPermissions();
  }
}


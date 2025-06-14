// src/app/header.component.ts
import { Component, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule }  from '@angular/material/button';
import { RouterModule }     from '@angular/router';
import { AuthService }      from '../../services/auth.service';
import { AuthorizationService } from '../../services/authorization.service';
import { Auth, authState, User } from '@angular/fire/auth';
import { Observable }       from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MatToolbarModule, MatButtonModule, RouterModule],
  template: `
    <mat-toolbar color="primary" class="app-toolbar">
      <span class="app-title">Pronto</span>
      <span class="spacer"></span>
      <button mat-button routerLink="/">Dashboard</button>
      <button mat-button routerLink="/stakeholder">Stakeholder</button>

      <!-- only show Logout when user is signed in -->
      <button
        mat-button
        (click)="onLogout()">
        Logout
      </button>
    </mat-toolbar>
  `
})
export class HeaderComponent {
  authSvc = inject(AuthService);
  user$: Observable<User | null> = authState(inject(Auth));
  authzSvc1 = inject(AuthorizationService);

  onLogout(): void {
    this.authSvc.logout();
    this.authzSvc1.clearPermissions();
  }
}
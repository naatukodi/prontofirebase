// src/app/header.component.ts
import { Component } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule }  from '@angular/material/button';
import { RouterModule }     from '@angular/router';

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
    </mat-toolbar>
  `
})
export class HeaderComponent {}

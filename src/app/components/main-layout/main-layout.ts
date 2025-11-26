// src/app/main-layout.component.ts
import { Component } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header';
import { FooterComponent } from '../footer/footer';
import { MatTabsModule } from '@angular/material/tabs'; // 2. Import MatTabsModule

@Component({
  standalone: true,
  selector: 'app-main-layout',
  host: { class: 'main-layout' }, 
  imports: [HeaderComponent, RouterOutlet, RouterModule, FooterComponent, MatTabsModule],
  template: `
    <app-header></app-header>

    <section class="hero">
      <div class="hero-content">
        <h1>
          <span style="color: green;">Pronto</span>
          <span style="color: red;">Moto</span>
        </h1>
        <p>Your one-stop valuations dashboard</p>
      </div>
    </section>

    <!-- THIS IS THE NEW NAVIGATION BAR -->
    <nav mat-tab-nav-bar [tabPanel]="tabPanel" backgroundColor="primary" class="main-nav-tabs">
      <a mat-tab-link
        [routerLink]="['/dashboard']"
        routerLinkActive
        #rla="routerLinkActive"
        [active]="rla.isActive">
        Valuations
      </a>
      <a mat-tab-link
        [routerLink]="['/market-value']"
        routerLinkActive
        #rla2="routerLinkActive"
        [active]="rla2.isActive">
        Instant AI Value
      </a>
    </nav>
    
    <!-- This invisible panel is required and fixes the red console error -->
    <mat-tab-nav-panel #tabPanel></mat-tab-nav-panel>

    <router-outlet></router-outlet>

    <app-footer></app-footer>
  `
})
export class MainLayoutComponent {}

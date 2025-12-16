// src/app/main-layout.component.ts
import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterModule, Router, NavigationEnd } from '@angular/router'; // 1. Added Router imports
import { CommonModule } from '@angular/common'; // 2. Added CommonModule for *ngIf
import { HeaderComponent } from '../header/header';
import { FooterComponent } from '../footer/footer';
import { MatTabsModule } from '@angular/material/tabs';
import { filter } from 'rxjs/operators'; // 3. Added filter

@Component({
  standalone: true,
  selector: 'app-main-layout',
  host: { class: 'main-layout' }, 
  // 4. Added CommonModule to imports
  imports: [CommonModule, HeaderComponent, RouterOutlet, RouterModule, FooterComponent, MatTabsModule],
  template: `
    <app-header></app-header>

    <ng-container *ngIf="isDashboard">
      
      <section class="hero">
        <div class="hero-content">
          <h1>
            <span style="color: green;">Pronto</span>
            <span style="color: red;">Moto</span>
          </h1>
          <p>Your one-stop valuations dashboard</p>
        </div>
      </section>

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
      
      <mat-tab-nav-panel #tabPanel></mat-tab-nav-panel>

    </ng-container>
    <router-outlet></router-outlet>

    <app-footer></app-footer>
  `
})
export class MainLayoutComponent implements OnInit {
  // Flag to control visibility
  isDashboard: boolean = true; 

  constructor(private router: Router) {}

  ngOnInit() {
    // 1. Check URL when the component first loads
    this.checkUrl(this.router.url);

    // 2. Listen for URL changes (navigation)
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.checkUrl(event.urlAfterRedirects);
    });
  }

  private checkUrl(url: string) {
    // If we are inside a specific valuation (e.g. /valuation/123/qc), hide the tabs.
    // Otherwise (dashboard, market-value, login), show them.
    if (url.includes('/valuation/')) {
      this.isDashboard = false;
    } else {
      this.isDashboard = true;
    }
  }
}
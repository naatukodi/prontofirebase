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
  imports: [CommonModule, HeaderComponent, RouterOutlet, RouterModule, FooterComponent, MatTabsModule],
  styles: [`
    ::ng-deep .main-nav-tabs {
      background: transparent !important;
      border-bottom: none !important;
      padding: 12px 0 8px;
    }
    ::ng-deep .main-nav-tabs .mat-mdc-tab-links {
      display: flex !important;
      justify-content: center !important;
      gap: 12px !important;
    }
    ::ng-deep .main-nav-tabs .mat-mdc-tab-link,
    ::ng-deep .main-nav-tabs a[mat-tab-link] {
      border: 2px solid #037076 !important;
      border-radius: 8px !important;
      padding: 7px 24px !important;
      font-weight: 700 !important;
      font-size: 0.8rem !important;
      letter-spacing: 0.6px !important;
      text-transform: uppercase !important;
      color: #037076 !important;
      background: #fff !important;
      min-width: unset !important;
      width: auto !important;
      flex-grow: 0 !important;
      height: 36px !important;
      line-height: 1 !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      text-align: center !important;
      opacity: 1 !important;
      transition: all 0.18s ease !important;
    }
    ::ng-deep .main-nav-tabs .mat-mdc-tab-link .mdc-tab__content,
    ::ng-deep .main-nav-tabs .mat-mdc-tab-link .mdc-tab__text-label {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 100% !important;
    }
    ::ng-deep .main-nav-tabs .mat-mdc-tab-link:hover {
      background: #037076 !important;
      color: #fff !important;
    }
    ::ng-deep .main-nav-tabs .mat-mdc-tab-link.mdc-tab--active {
      background: #037076 !important;
      color: #fff !important;
    }
    ::ng-deep .main-nav-tabs .mdc-tab-indicator,
    ::ng-deep .main-nav-tabs .mat-mdc-tab-ripple {
      display: none !important;
    }
    ::ng-deep .main-nav-tabs .mat-mdc-tab-header-pagination {
      display: none !important;
    }
  `],
  template: `
    <app-header></app-header>

    <ng-container *ngIf="isDashboard">
      
      <section class="hero">
        <div class="hero-content">
          <h1 style="text-transform: uppercase;">
            <span style="color: #ffffff; font-weight: 900;">VEHGA</span><span style="color: #99f6e4; font-weight: 900;">INSPECTIONS</span>
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
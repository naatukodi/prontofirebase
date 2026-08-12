// src/app/main-layout.component.ts
import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterModule, Router, NavigationEnd } from '@angular/router'; // 1. Added Router imports
import { CommonModule } from '@angular/common'; // 2. Added CommonModule for *ngIf
import { HeaderComponent } from '../header/header';
import { FooterComponent } from '../footer/footer';
import { MatTabsModule } from '@angular/material/tabs';
import { filter } from 'rxjs/operators'; // 3. Added filter
import { AuthorizationService } from '../../services/authorization.service';

@Component({
  standalone: true,
  selector: 'app-main-layout',
  host: { class: 'main-layout' },
  imports: [CommonModule, HeaderComponent, RouterOutlet, RouterModule, FooterComponent, MatTabsModule],
  styles: [`
    ::ng-deep .main-nav-tabs {
      background: transparent !important;
      border-bottom: none !important;
      padding: 16px 0 4px;
    }
    ::ng-deep .main-nav-tabs .mat-mdc-tab-links {
      display: flex !important;
      justify-content: center !important;
      gap: 0 !important;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 4px;
      width: fit-content;
      margin: 0 auto;
      box-shadow: var(--shadow-sm);
    }
    ::ng-deep .main-nav-tabs .mat-mdc-tab-link,
    ::ng-deep .main-nav-tabs a[mat-tab-link] {
      border: none !important;
      border-radius: 999px !important;
      padding: 8px 26px !important;
      font-weight: 600 !important;
      font-size: 0.85rem !important;
      color: var(--ink-700) !important;
      background: transparent !important;
      min-width: unset !important;
      width: auto !important;
      flex-grow: 0 !important;
      height: 38px !important;
      line-height: 1 !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      text-align: center !important;
      opacity: 1 !important;
      transition: background 0.15s ease, color 0.15s ease !important;
    }
    ::ng-deep .main-nav-tabs .mat-mdc-tab-link .mdc-tab__content,
    ::ng-deep .main-nav-tabs .mat-mdc-tab-link .mdc-tab__text-label {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 100% !important;
    }
    ::ng-deep .main-nav-tabs .mat-mdc-tab-link:hover {
      background: var(--brand-50) !important;
      color: var(--brand-700) !important;
    }
    ::ng-deep .main-nav-tabs .mat-mdc-tab-link.mdc-tab--active {
      background: var(--grad-brand) !important;
      color: #fff !important;
      box-shadow: var(--shadow-brand);
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
          <h1>
            <span style="color: #ffffff;">VEHGA</span><span style="color: var(--accent);">INSPECTIONS</span>
          </h1>
          <p>Your one-stop vehicle inspection &amp; valuation dashboard</p>
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
        <a mat-tab-link
          *ngIf="isAdmin"
          [routerLink]="['/mis']"
          routerLinkActive
          #rla3="routerLinkActive"
          [active]="rla3.isActive">
          MIS
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
  isAdmin = false;

  constructor(private router: Router, private authz: AuthorizationService) {}

  ngOnInit() {
    // Admin-only nav items (MIS)
    this.authz.loadPermissions()
      .then(perms => { this.isAdmin = perms.includes('Admin'); })
      .catch(() => { this.isAdmin = false; });

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
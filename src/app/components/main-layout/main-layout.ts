// src/app/main-layout.component.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header';
import { FooterComponent } from '../footer/footer';

@Component({
  standalone: true,
  selector: 'app-main-layout',
  host: { class: 'main-layout' }, 
  imports: [HeaderComponent, RouterOutlet, FooterComponent],
  template: `
    <app-header></app-header>

    <section class="hero">
      <div class="hero-content">
        <h1>Pronto Moto</h1>
        <p>Your one-stop valuations dashboard</p>
      </div>
    </section>

    <router-outlet></router-outlet>

    <app-footer></app-footer>
  `
})
export class MainLayoutComponent {}

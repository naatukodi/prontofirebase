import 'zone.js';   
import { Component } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HeaderComponent } from '../app/components/header/header';
import { FooterComponent } from '../app/components/footer/footer';
import { Test } from './test/test';

const routes: Routes = [
  // Define your routes here
  { path: 'test', component: Test }
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, RouterModule],
  template: `
    <app-header></app-header>

    <!-- Hero section -->
    <section class="hero">
      <div class="hero-content">
        <h1>Pronto Moto</h1>
        <p>Your one-stop valuations dashboard</p>
      </div>
    </section>

    <!-- Routed pages render here -->
    <router-outlet></router-outlet>

    <app-footer></app-footer>
  `
})
export class App {
  protected title = 'prontofirebase';
}

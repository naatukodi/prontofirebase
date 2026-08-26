import 'zone.js';
import { Component, inject } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Test } from './test/test';
import { BrandService } from './services/brand.service';

const routes: Routes = [
  // Define your routes here
  { path: 'test', component: Test }
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ RouterModule],
  template: `<router-outlet></router-outlet>`
})
export class App {
  protected title = 'prontofirebase';

  private brand = inject(BrandService);

  constructor() {
    // Paint the remembered (or pinned) brand before the first view renders, so the
    // app never flashes Vehga's palette on the way to a Pronto session.
    this.brand.apply();
  }
}

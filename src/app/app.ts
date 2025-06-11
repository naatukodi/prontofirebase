import 'zone.js';   
import { Component } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Test } from './test/test';

const routes: Routes = [
  // Define your routes here
  { path: 'test', component: Test }
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule],
  template: '<router-outlet></router-outlet>'
})
export class App {
  protected title = 'prontofirebase';
}

// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { Test } from './test/test';
import { App } from './app';

export const routes: Routes = [
  { path: 'test', component: Test },
  // you can keep your existing home component or point '' to Test
  { path: '', redirectTo: 'test', pathMatch: 'full' },
  { path: '**', redirectTo: 'test' }
];

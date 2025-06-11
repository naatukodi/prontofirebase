// src/main.ts
import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { BrowserModule } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { AuthInterceptor } from './app/auth/auth.interceptor';

import { App } from './app/app';
import { routes } from './app/app.routes';
import { environment } from './environments/environment';

bootstrapApplication(App, {
  providers: [
    importProvidersFrom(BrowserModule, HttpClientModule),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },

    // Initialize your Firebase app
    provideFirebaseApp(() => initializeApp(environment.firebase)),

    // Register the Auth service
    provideAuth(() => getAuth()),

    // Your router configuration
    provideRouter(routes)
  ]
})
.catch(err => console.error(err));

// src/main.ts
import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom, LOCALE_ID } from '@angular/core';
import { registerLocaleData, DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';
import localeEnIn from '@angular/common/locales/en-IN';
import { provideRouter } from '@angular/router';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { BrowserModule } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { AuthInterceptor } from './app/auth/auth.interceptor';

import { MatExpansionModule }    from '@angular/material/expansion';
import { MatToolbarModule }      from '@angular/material/toolbar';
import { MatFormFieldModule }    from '@angular/material/form-field';
import { MatInputModule }        from '@angular/material/input';
import { MatButtonModule }       from '@angular/material/button';
import { MatDatepickerModule }   from '@angular/material/datepicker';
import { MatNativeDateModule, DateAdapter, MAT_DATE_LOCALE, MAT_DATE_FORMATS } from '@angular/material/core';
import { IndianDateAdapter, INDIAN_DATE_FORMATS } from './app/shared/indian-date-adapter';
import { MatIconModule }         from '@angular/material/icon';
import { MatCheckboxModule }     from '@angular/material/checkbox';
import { MatSelectModule }       from '@angular/material/select';
import { MatTabsModule }         from '@angular/material/tabs';
import { MatSnackBarModule }     from '@angular/material/snack-bar';

import { App } from './app/app';
import { routes } from './app/app.routes';
import { environment } from './environments/environment';

registerLocaleData(localeEnIn);

bootstrapApplication(App, {
  providers: [
    importProvidersFrom(
      BrowserModule,
      HttpClientModule,
      // Angular Material
      MatExpansionModule,
      MatToolbarModule,
      MatFormFieldModule,
      MatInputModule,
      MatButtonModule,
      MatDatepickerModule,
      MatNativeDateModule,
      MatIconModule,
      MatCheckboxModule,
      MatSelectModule,
      MatTabsModule,
      MatSnackBarModule
    ),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },

    // Dates are DD-MM-YYYY everywhere. The pipe default covers templates that
    // omit a format argument; the adapter covers the Material datepickers, which
    // ignore MAT_DATE_FORMATS for display and cannot parse day-first input
    // without it.
    { provide: LOCALE_ID, useValue: 'en-IN' },
    { provide: DATE_PIPE_DEFAULT_OPTIONS, useValue: { dateFormat: 'dd-MM-yyyy' } },
    { provide: MAT_DATE_LOCALE, useValue: 'en-IN' },
    { provide: DateAdapter, useClass: IndianDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: INDIAN_DATE_FORMATS },

    // Initialize your Firebase app
    provideFirebaseApp(() => initializeApp(environment.firebase)),

    // Register the Auth service
    provideAuth(() => getAuth()),

    // Your router configuration
    provideRouter(routes)
  ]
})
.catch(err => console.error(err));

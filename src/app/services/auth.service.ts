// src/app/services/auth.service.ts
import { Injectable, inject, Injector } from '@angular/core';
import { Auth, authState, User, signOut } from '@angular/fire/auth';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { AuthorizationService } from './authorization.service';
import { BrandService } from './brand.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private router = inject(Router);
  private injector = inject(Injector);
  /** The URL the user tried to access before login */
  returnUrl = '/';

  /** Wait for Firebase Auth to initialize and return the current user (or null). */
  async getCurrentUser(): Promise<User | null> {
    return firstValueFrom(authState(this.auth));
  }

  /** Force-refresh ID token when needed */
  async refreshToken(): Promise<string | null> {
    const user = await this.getCurrentUser();
    if (user) {
      return user.getIdToken(true);
    }
    return null;
  }

  async logout() {
    await signOut(this.auth);

    // lazily fetch the AuthorizationService to avoid a circular-dep
    const authz = this.injector.get(
      AuthorizationService,
      null
    );
    authz?.clearPermissions();

    // Drop the company choice too, so the next person to sign in on this machine
    // has to pick deliberately rather than inheriting the last session's brand.
    this.injector.get(BrandService, null)?.clear();

    this.router.navigate(['/login']);
  }
}

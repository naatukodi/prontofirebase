// src/app/services/auth.service.ts
import { Injectable, inject } from '@angular/core';
import { Auth, authState, User } from '@angular/fire/auth';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
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
}

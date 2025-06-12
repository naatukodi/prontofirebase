// src/app/services/authorization.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthorizationService {
  private http = inject(HttpClient);
  private authSvc = inject(AuthService);

  /** null = not yet loaded; [] = loaded but empty */
  private perms: string[] | null = null;

  async loadPermissions(): Promise<string[]> {
    // return cache if loaded
    if (this.perms !== null) {
      console.log('⚡️ Permissions (cached):', this.perms);
      return this.perms;
    }

    // wait for the user to be available
    const user = await this.authSvc.getCurrentUser();
    console.log('🔍 loadPermissions: currentUser =', user);

    if (!user || !user.phoneNumber) {
      console.warn('⚠️ No user signed in or missing phoneNumber!');
      this.perms = [];
      return [];
    }

    // URL-encode phone number
    const phoneId = encodeURIComponent(user.phoneNumber);
    const url = `${environment.apiBaseUrl}/users/${phoneId}/roles`;
    console.log('🔍 Fetching roles from:', url);

    try {
      const roles = (await this.http.get<string[]>(url).toPromise()) || [];
      console.log('✅ Received roles:', roles);
      this.perms = roles;
      return roles;
    } catch (err) {
      console.error('❌ Error fetching roles:', err);
      this.perms = [];
      return [];
    }
  }

  hasPermission(perm: string): boolean {
    return this.perms?.includes(perm) ?? false;
  }
}

// src/app/services/authorization.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient }        from '@angular/common/http';
import { AuthService }       from './auth.service';
import { environment }       from '../../environments/environment';

const STORAGE_KEY = 'pronto_user_roles';

@Injectable({ providedIn: 'root' })
export class AuthorizationService {
  private http    = inject(HttpClient);
  private authSvc = inject(AuthService);

  // in-memory cache
  private perms: string[] | null = null;

  /** Load roles (memory → storage → API) */
  async loadPermissions(): Promise<string[]> {
    // 1) in-memory?
    if (this.perms !== null) {
      return this.perms;
    }

    // 2) localStorage?
    const fromStorage = localStorage.getItem(STORAGE_KEY);
    if (fromStorage) {
      try {
        this.perms = JSON.parse(fromStorage) as string[];
        console.log('⚡️ Permissions (from localStorage):', this.perms);
        return this.perms;
      } catch {
        // corrupt JSON? clear it
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    // 3) fall back to API
    const user = await this.authSvc.getCurrentUser();
    if (!user?.phoneNumber) {
      this.perms = [];
      return [];
    }

    const phoneId = encodeURIComponent(user.phoneNumber);
    const url     = `${environment.apiBaseUrl}/users/${phoneId}/roles`;

    try {
      const roles = (await this.http.get<string[]>(url).toPromise()) || [];
      this.perms = roles;

      // persist to storage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
      console.log('✅ Permissions fetched & cached:', roles);

      return roles;
    } catch (err) {
      console.error('❌ Error fetching roles:', err);
      this.perms = [];
      return [];
    }
  }

  /** Quick check in guards/components */
  hasPermission(perm: string): boolean {
    return this.perms?.includes(perm) ?? false;
  }

  /** Returns true if the user has _any_ of the given permissions. */
  hasAnyPermission(perms: string[]): boolean {
    if (!this.perms) { return false; }
    return perms.some(p => this.perms!.includes(p));
  }

  /** Call this on logout to clear caches */
  clearPermissions() {
    this.perms = null;
    localStorage.removeItem(STORAGE_KEY);
  }
}

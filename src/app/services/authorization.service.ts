// src/app/authorization.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { getAuth } from 'firebase/auth';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthorizationService {
  private perms: string[]|null = null;

  constructor(private http: HttpClient) {}

  async loadPermissions(): Promise<string[]> {
    if (this.perms) {
      return this.perms;
    }

    // Grab the signed-in user's phone number from Firebase Auth
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user?.phoneNumber) {
      throw new Error('No phone number available on the signed-in user');
    }

    // Build the URL: /api/users/{phoneNumber}/roles
    const phoneId = encodeURIComponent(user.phoneNumber);
    const url = `${environment.apiBaseUrl}/users/${phoneId}/roles`;

    // Fetch and cache
    this.perms = await this.http.get<string[]>(url).toPromise() || [];
    return this.perms;
  }

  hasPermission(perm: string): boolean {
    return !!this.perms?.includes(perm);
  }
}

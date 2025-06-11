// src/app/authorization.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { getAuth } from 'firebase/auth';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthorizationService {
  private perms: string[] = [];

  constructor(private http: HttpClient) {}

 async loadPermissions(): Promise<string[]> {
  if (this.perms) {
    console.log('⚡️ Permissions (cached):', this.perms);
    return this.perms;
  }

  const auth = getAuth();
  const user = auth.currentUser;
  console.log('🔍 loadPermissions: currentUser =', user);

  if (!user) {
    console.warn('⚠️ No user signed in!');
    return [];
  }

  // Try to read phoneNumber, fall back to UID if needed
  const id = user.phoneNumber ?? user.uid;
  console.log('🔍 Using user ID for roles lookup:', id);

  const phoneId = encodeURIComponent(id);
  const url = `${environment.apiBaseUrl}/users/${phoneId}/roles`;
  console.log('🔍 Fetching roles from:', url);

  try {
    const roles = await this.http.get<string[]>(url).toPromise() ?? [];
    console.log('✅ Received roles:', roles);
    this.perms = roles;
    return roles;
  } catch (err) {
    console.error('❌ Error fetching roles:', err);
    return [];
  }
}

  hasPermission(perm: string): boolean {
    // safe-check: if perms is undefined or empty, returns false
    return this.perms?.includes(perm) ?? false;
  }
}

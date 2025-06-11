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
  if (this.perms) return this.perms;

  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');

  // Prefer phoneNumber, but fall back to uid
  const userId = encodeURIComponent(user.phoneNumber ?? user.uid);

  const url = `${environment.apiBaseUrl}/users/${userId}/roles`;
  this.perms = await this.http.get<string[]>(url).toPromise() ?? [];
  return this.perms;
}


  hasPermission(perm: string): boolean {
    // safe-check: if perms is undefined or empty, returns false
    return this.perms?.includes(perm) ?? false;
  }
}

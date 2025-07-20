import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private base = `${environment.apiBaseUrl}/users`;

  constructor(private http: HttpClient) {}

  getUserRoles(phone: string): Observable<string[]> {
    // phone must be URL‐encoded
    const encoded = encodeURIComponent(phone);
    return this.http.get<string[]>(`${this.base}/${encoded}/roles`, {
      responseType: 'json'
    });
  }
}

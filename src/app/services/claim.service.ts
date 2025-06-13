import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Claim } from '../models/claim.model';
import { Valuation } from '../models/valuation.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ClaimService {
  private apiUrl = `${environment.apiBaseUrl}/Valuations`;

  constructor(private http: HttpClient) {}

  /**
   * Fetch all claims, optionally filtered by adjusterUserId and status
   */
  getAll(
    adjusterUserId?: string,
    status?: string
  ): Observable<Claim[]> {
    let params = new HttpParams();
    if (adjusterUserId) {
      params = params.set('adjusterUserId', adjusterUserId);
    }
    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<Claim[]>(this.apiUrl, { params });
  }

  getOpenValuations(): Observable<Valuation[]> {
    return this.http.get<Valuation[]>(`${this.apiUrl}/open`);
  }

  create(v: Valuation): Observable<Valuation> {
    return this.http.post<Valuation>(this.apiUrl, v);
  }

  /**
   * Patch stakeholder for a valuation
   * @param id Valuation ID
   * @param stakeholderData Data to patch
   */
  patchStakeholder(id: string, stakeholderData?: any): Observable<any> {
    const url = `${this.apiUrl}/${id}/stakeholder`;
    if (stakeholderData instanceof FormData) {
      return this.http.patch<any>(url, stakeholderData, {
        headers: { }
      });
    }
    return this.http.patch<any>(url, stakeholderData ?? {});
  }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Claim } from '../models/claim.model';
import { Valuation, WFValuation } from '../models/valuation.model';
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

  getOpenValuations(): Observable<WFValuation[]> {
    return this.http.get<WFValuation[]>(`${this.apiUrl}/workflows/open`);
  }

  create(v: Valuation): Observable<Valuation> {
    return this.http.post<Valuation>(this.apiUrl, v);
  }

  /**
   * Fetch open valuations filtered by one or more state keys
   */
  getByStates(stateKeys: string[]): Observable<WFValuation[]> {
    let params = new HttpParams();
    stateKeys.forEach(key => {
      params = params.append('stateKeys', key);
    });
    return this.http.get<WFValuation[]>(
      `${this.apiUrl}/workflows/open/filter/states`,
      { params }
    );
  }

  getValuationsByAdjusterPhone(phoneNumber: string): Observable<WFValuation[]> {
    const params = new HttpParams().set('assignedToPhoneNumber', phoneNumber);
    return this.http.get<WFValuation[]>(
      `${this.apiUrl}/workflows/open/assignedto/phone`,
      { params }
    );
  }

  /**
   * Fetch open valuations filtered by one or more district keys
   */
  getByDistricts(districtKeys: string[]): Observable<WFValuation[]> {
    let params = new HttpParams();
    districtKeys.forEach(key => {
      params = params.append('districtKeys', key);
    });
    return this.http.get<WFValuation[]>(
      `${this.apiUrl}/workflows/open/filter/districts`,
      { params }
    );
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

    assignBackend(
      valuationId: string,
      vehicleNumber: string,
      applicantContact: string,
      name: string,
      phone: string,
      email: string,
      whatsapp: string
    ): Observable<void> {
      const url = `${this.apiUrl}/${valuationId}/vehicledetails/assignment`
        + `?valuationId=${encodeURIComponent(valuationId)}`
        + `&vehicleNumber=${encodeURIComponent(vehicleNumber)}`
        + `&applicantContact=${encodeURIComponent(applicantContact)}`
        + `&assignedTo=${encodeURIComponent(name)}`
        + `&assignedToPhoneNumber=${encodeURIComponent(phone)}`
        + `&assignedToEmail=${encodeURIComponent(email)}`
        + `&assignedToWhatsapp=${encodeURIComponent(whatsapp)}`;
      return this.http.post<void>(url, '');
  }
}

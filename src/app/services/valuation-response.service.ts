import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface CompleteValuationResponsePayload {
  status: 'Completed' | 'Pending' | 'Rejected';
  completedAt: string;         // ISO string with Z
  completedBy: string;
  remarks?: string;
}

@Injectable({ providedIn: 'root' })
export class ValuationResponseService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiBaseUrl; // e.g. ".../api/"

  completeValuationResponse(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string,
    body: CompleteValuationResponsePayload
  ): Observable<void> {
    const url = `${this.baseUrl}valuations/${encodeURIComponent(valuationId)}/valuationresponse/complete`;
    const params = new HttpParams()
      .set('vehicleNumber', vehicleNumber)               // match your cURL exactly
      .set('applicantContact', applicantContact);

    return this.http.post<void>(url, body, {
      params,
      headers: { 'Content-Type': 'application/json', 'accept': '*/*' }
    });
  }

  


  deleteValuationResponse(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string
  ): Observable<void> {
    const url = `${this.baseUrl}valuations/${encodeURIComponent(valuationId)}/valuationresponse/delete`;
    const params = new HttpParams()
      .set('vehicleNumber', vehicleNumber)
      .set('applicantContact', applicantContact);

    return this.http.delete<void>(url, { params });

  
}
}
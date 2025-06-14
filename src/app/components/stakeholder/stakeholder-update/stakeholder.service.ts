// src/app/stakeholder/stakeholder.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Stakeholder } from './stakeholder.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StakeholderService {
  private readonly baseUrl = `${environment.apiBaseUrl}valuations`;

  constructor(private http: HttpClient) {}

  /**
   * Fetch the stakeholder section for this valuation, vehicle & applicant
   */
  getStakeholder(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string
  ): Observable<Stakeholder> {
    const url = `${this.baseUrl}/${valuationId}/stakeholder` +
      `?vehicleNumber=${encodeURIComponent(vehicleNumber)}` +
      `&applicantContact=${encodeURIComponent(applicantContact)}`;
    return this.http.get<Stakeholder>(url);
  }

  /**
   * Create or update the stakeholder section and all document uploads in one call
   * Expects a multipart/form-data FormData containing all fields and files
   */
  upsertStakeholder(
    valuationId: string,
    formData: FormData
  ): Observable<void> {
    const url = `${this.baseUrl}/${valuationId}/stakeholder`;
    return this.http.put<void>(url, formData);
  }


updateStakeholder(
  valuationId: string,
  vehicleNumber: string,
  applicantContact: string,
  body: any
): Observable<any> {
  const qp = new HttpParams()
    .set('vehicleNumber', vehicleNumber)
    .set('applicantContact', applicantContact);

  return this.http.put(
    `/api/valuations/${valuationId}/stakeholder`,
     body,
     { params: qp }
  );
}

  /**
   * Delete the stakeholder section for this valuation
   */
  deleteStakeholder(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string
  ): Observable<void> {
    const url = `${this.baseUrl}/${valuationId}/stakeholder` +
      `?vehicleNumber=${encodeURIComponent(vehicleNumber)}` +
      `&applicantContact=${encodeURIComponent(applicantContact)}`;
    return this.http.delete<void>(url);
  }

  startWorkflow(id: string, vehicleNumber: string, applicantContact: string) {
  const url = `${this.baseUrl}/${id}/workflow/1/start?vehicleNumber=${vehicleNumber}&applicantContact=${applicantContact}`;
  return this.http.post(url, {});
}

completeWorkflow(id: string, vehicleNumber: string, applicantContact: string) {
  const url = `${this.baseUrl}/${id}/workflow/1/complete?vehicleNumber=${vehicleNumber}&applicantContact=${applicantContact}`;
  return this.http.post(url, {});
}
}

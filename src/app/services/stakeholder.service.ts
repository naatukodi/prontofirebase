import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Stakeholder } from '../models/stakeholder.model';

@Injectable({ providedIn: 'root' })
export class StakeholderService {
private base = `${environment.apiBaseUrl}/Valuations`;

  constructor(private http: HttpClient) {}

  getStakeholder(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string
  ): Observable<Stakeholder> {
    const url = `${this.base}/${valuationId}/stakeholder` +
      `?vehicleNumber=${vehicleNumber}` +
      `&applicantContact=${applicantContact}`;
    return this.http.get<Stakeholder>(url);
  }

  deleteStakeholder(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string
  ): Observable<void> {
    const url = `${this.base}/${valuationId}/stakeholder` +
      `?vehicleNumber=${vehicleNumber}` +
      `&applicantContact=${applicantContact}`;
    return this.http.delete<void>(url);
  }

  updateStakeholder(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string,
    formData: FormData         // ← accept a FormData here
  ): Observable<any> {
    const params = new HttpParams()
      .set('vehicleNumber', vehicleNumber)
      .set('applicantContact', applicantContact);

    // NOTE: Don’t set a Content-Type header here; HttpClient will 
    // detect the FormData and let the browser add the proper
    // multipart boundary for you.
    return this.http.put(
      `${this.base}/${valuationId}/stakeholder`,
      formData,
      { params }
    );
  }

  newStakeholder(
  valuationId: string,
  vehicleNumber: string,
  applicantContact: string,
  body: any
): Observable<any> {
  const qp = new HttpParams()
    .set('vehicleNumber', vehicleNumber)
    .set('applicantContact', applicantContact);

  return this.http.put(
    `${this.base}/${valuationId}/stakeholder`,
     body
  );
}

  startWorkflow(valuationId: string, stepOrder: number, vehicleNumber: string, applicantContact: string): Observable<void> {
    return this.http.post<void>(
      `${this.base}/${valuationId}/workflow/${stepOrder}/start?vehicleNumber=${vehicleNumber}&applicantContact=${applicantContact}`,
      null
    );
  }

  completeWorkflow(valuationId: string, stepOrder: number, vehicleNumber: string, applicantContact: string): Observable<void> {
    return this.http.post<void>(
      `${this.base}/${valuationId}/workflow/${stepOrder}/complete?vehicleNumber=${vehicleNumber}&applicantContact=${applicantContact}`,
      null
    );
  }
}
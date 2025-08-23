// src/app/services/quality-control.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { QualityControl } from '../models/QualityControl';
import { ValuationEstimate } from '../models/ValuationEstimate';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class QualityControlService {
  private readonly baseUrl = environment.apiBaseUrl + 'valuations';

  constructor(private http: HttpClient) {}

  getQualityControlDetails(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string
  ): Observable<QualityControl> {
    const url = `${this.baseUrl}/${valuationId}/qualitycontrol`;
    const params = new HttpParams()
      .set('vehicleNumber', vehicleNumber)
      .set('applicantContact', applicantContact);
    return this.http
      .get<QualityControl>(url, { params })
      .pipe(catchError((err: HttpErrorResponse) => throwError(() => err)));
  }

  getValuationEstimate(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string
  ): Observable<ValuationEstimate> {
    const url = `${this.baseUrl}/${valuationId}/qualitycontrol`;
    const params = new HttpParams()
      .set('vehicleNumber', vehicleNumber)
      .set('applicantContact', applicantContact);
    return this.http
      .get<ValuationEstimate>(url, { params })
      .pipe(catchError((err: HttpErrorResponse) => throwError(() => err)));
  }

  getValuationDetailsfromAI(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string
  ): Observable<any> {
    const url = `${this.baseUrl}/${valuationId}/valuation`;
    const params = new HttpParams()
      .set('vehicleNumber', vehicleNumber)
      .set('applicantContact', applicantContact);
    return this.http
      .get<any>(url, { params })
      .pipe(catchError((err: HttpErrorResponse) => throwError(() => err)));
  }

  deleteQualityControlDetails(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string
  ): Observable<any> {
    const url = `${this.baseUrl}/${valuationId}/qualitycontrol`;
    const params = new HttpParams()
      .set('vehicleNumber', vehicleNumber)
      .set('applicantContact', applicantContact);
    return this.http
      .delete(url, { params })
      .pipe(catchError((err: HttpErrorResponse) => throwError(() => err)));
  }

  updateQualityControlDetails(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string,
    body: any
  ): Observable<any> {
    const url = `${this.baseUrl}/${valuationId}/qualitycontrol`;
    const params = new HttpParams()
      .set('vehicleNumber', vehicleNumber)
      .set('applicantContact', applicantContact);
    return this.http
      .put(url, body, { params })
      .pipe(catchError((err: HttpErrorResponse) => throwError(() => err)));
  }

  assignQualityControl(
      valuationId: string,
      vehicleNumber: string,
      applicantContact: string,
      name: string,
      phone: string,
      email: string,
      whatsapp: string
        ): Observable<void> {
        const url = `${this.baseUrl}/${valuationId}/qualitycontrol/assignment`
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

// src/app/services/quality-control.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { QualityControl } from '../models/QualityControl';
import { ValuationEstimate } from '../models/ValuationEstimate';
import { environment } from '../../environments/environment';

/** The raw values the reader saw, shown as-is so a misread is distinguishable. */
export interface QcAiReadings {
  registrationPlate?: string | null;
  chassisNumber?: string | null;
  chassisStencil?: string | null;
  vinPlate?: string | null;
  odometerKm?: number | null;
  places: string[];
  captureDates: string[];
  stampedPhotos: number;
  totalPhotos: number;
}

/** What the photo audit returns: verdicts, the evidence behind each, and any note. */
export interface QcAiAudit {
  /** Checklist key to verdict. A key absent here was NOT verified. */
  cl: Record<string, string>;
  /** Checklist key to what was compared. Always populated, even when cl is not. */
  why: Record<string, string>;
  observations: string[];
  /** What the reader actually saw, as opposed to what was concluded. */
  readings?: QcAiReadings | null;
  readAt?: string | null;
  /** True when this came from the stored reading rather than a fresh call. */
  cached?: boolean;
  /** Set when the audit could not run at all. */
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class QualityControlService {
  private readonly baseUrl = environment.apiBaseUrl + 'valuations';

  constructor(private http: HttpClient) {}

  /**
   * Reads the case's inspection photos and returns suggested verdicts.
   *
   * Called automatically when a QC page opens. The backend stores the reading
   * against the photo set, so only the first open of a given set of photos costs
   * anything — after that this returns the stored answer. Pass force to read again.
   *
   * Nothing is saved to the QC form by this: the reviewer still saves, so a
   * reading can never overwrite a human verdict.
   */
  runAiPhotoAudit(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string,
    force = false
  ): Observable<QcAiAudit> {
    const url = `${this.baseUrl}/${valuationId}/qualitycontrol/ai-photo-audit`;
    let params = new HttpParams()
      .set('vehicleNumber', vehicleNumber)
      .set('applicantContact', applicantContact);
    if (force) params = params.set('force', 'true');
    return this.http
      .post<QcAiAudit>(url, null, { params })
      .pipe(catchError((err: HttpErrorResponse) => throwError(() => err)));
  }

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

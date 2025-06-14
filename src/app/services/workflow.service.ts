// src/app/services/valuation.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WorkflowService {
  private readonly baseUrl = environment.apiBaseUrl + 'valuations';

  constructor(private http: HttpClient) {}

  startWorkflow(valuationId: string, stepOrder: number, vehicleNumber: string, applicantContact: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/${valuationId}/workflow/${stepOrder}/start?vehicleNumber=${vehicleNumber}&applicantContact=${applicantContact}`,
      null
    );
  }

  completeWorkflow(valuationId: string, stepOrder: number, vehicleNumber: string, applicantContact: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/${valuationId}/workflow/${stepOrder}/complete?vehicleNumber=${vehicleNumber}&applicantContact=${applicantContact}`,
      null
    );
  }
  getWorkflowStatus(valuationId: string, vehicleNumber: string, applicantContact: string): Observable<any> {
    const url = `${this.baseUrl}/${valuationId}/workflow`;
    const params = new HttpParams()
      .set('vehicleNumber', vehicleNumber)
      .set('applicantContact', applicantContact);

    return this.http.get<any>(url, { params })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          // normalize or rethrow
          return throwError(() => err);
        })
      );
  }
}

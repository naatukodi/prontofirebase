// src/app/services/valuation.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';    
import { VehicleDetails } from '../models/VehicleDetails';
import { WorkflowService } from '../services/workflow.service';
import { environment } from '../../environments/environment';
import { FinalReport } from '../models/final-report.model';

@Injectable({
  providedIn: 'root'
})
export class ValuationService {
private readonly baseUrl = environment.apiBaseUrl + 'valuations';

  constructor(private http: HttpClient, private workflowService: WorkflowService) {}

  getVehicleDetails(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string
  ): Observable<VehicleDetails> {
    const url = `${this.baseUrl}/${valuationId}/vehicledetails`;
    const params = new HttpParams()
      .set('vehicleNumber', vehicleNumber)
      .set('applicantContact', applicantContact);

    return this.http
      .get<VehicleDetails>(url, { params })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          // normalize or rethrow
          return throwError(() => err);
        })
      );
  }

    updateVehicleDetails(
        valuationId: string,
        vehicleNumber: string,
        applicantContact: string,
        body: any
    ): Observable<any> {
        const url = `${this.baseUrl}/${valuationId}/vehicledetails`;
        const params = new HttpParams()
        .set('vehicleNumber', vehicleNumber)
        .set('applicantContact', applicantContact);
    
        return this.http.put(url, body, { params })
        .pipe(
            catchError((err: HttpErrorResponse) => {
            // normalize or rethrow
            return throwError(() => err);
            })
        );
  } 

  getValuationDetailsfromAttesterApi(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string
  ): Observable<any> {
    const url = `${this.baseUrl}/${valuationId}/vehicledetails/with-rc`;
    const params = new HttpParams()
      .set('vehicleNumber', vehicleNumber)
      .set('applicantContact', applicantContact);

    return this.http.get(url, { params })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          // normalize or rethrow
          return throwError(() => err);
        })
      );
  }

  getFinalReport(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string
  ): Observable<FinalReport> {
    const params = new HttpParams()
      .set('vehicleNumber', vehicleNumber)
      .set('applicantContact', applicantContact);

    const url = `${this.baseUrl}/${valuationId}/valuationresponse/FinalReport`;
    return this.http.get<FinalReport>(url, { params });
  }
}

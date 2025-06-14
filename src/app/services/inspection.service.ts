// src/app/services/inspection.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { WorkflowService } from '../services/workflow.service';
import { environment } from '../../environments/environment';
import { Inspection } from '../models/Inspection';

@Injectable({
  providedIn: 'root'
})
export class InspectionService {
  private readonly baseUrl = environment.apiBaseUrl + 'valuations';

  constructor(private http: HttpClient, private workflowService: WorkflowService) {}

  getInspectionDetails(
      valuationId: string,
      vehicleNumber: string,
      applicantContact: string
  ): Observable<Inspection> {
      const url = `${this.baseUrl}/${valuationId}/inspection`;
      const params = new HttpParams()
      .set('vehicleNumber', vehicleNumber)
      .set('applicantContact', applicantContact);

        return this.http
        .get<Inspection>(url, { params })
        .pipe(
            catchError((err: HttpErrorResponse) => {
            // normalize or rethrow
            return throwError(() => err);
            })
        );
    }
    
    updateInspectionDetails(
        valuationId: string,
        vehicleNumber: string,
        applicantContact: string,
        body: any
    ): Observable<any> {
        const url = `${this.baseUrl}/${valuationId}/inspection`;
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

    deleteInspectionDetails(
        valuationId: string,
        vehicleNumber: string,
        applicantContact: string
    ): Observable<void> {
        const url = `${this.baseUrl}/${valuationId}/inspection`;
        const params = new HttpParams()
        .set('vehicleNumber', vehicleNumber)
        .set('applicantContact', applicantContact);

            return this.http.delete<void>(url, { params })
            .pipe(
                catchError((err: HttpErrorResponse) => {
                // normalize or rethrow
                return throwError(() => err);
                })
            );
        }       
    }
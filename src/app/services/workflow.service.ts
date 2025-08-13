// src/app/services/valuation.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { WorkflowTable } from '../models/WorkflowTable';

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

  updateWorkflowTable(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string,
    fields: Partial<{
      applicantName: string;
      workflow: string;
      workflowStepOrder: number;
      status: string;
      createdAt: string;
      completedAt: string;
      updatedAt: string;
      assignedTo: string;
      location: string;
      state: string;
      district: string;
      assignedToPhoneNumber: string;
      assignedToEmail: string;
      assignedToWhatsapp: string;
      stakeholderAssignedTo: string;
      stakeholderAssignedToPhoneNumber: string;
      stakeholderAssignedToEmail: string;
      stakeholderAssignedToWhatsapp: string;
      backEndAssignedTo: string;
      backEndAssignedToPhoneNumber: string;
      backEndAssignedToEmail: string;
      backEndAssignedToWhatsapp: string;
      avoAssignedTo: string;
      avoAssignedToPhoneNumber: string;
      avoAssignedToEmail: string;
      avoAssignedToWhatsapp: string;
      qualityControlAssignedTo: string;
      qualityControlAssignedToPhoneNumber: string;
      qualityControlAssignedToEmail: string;
      qualityControlAssignedToWhatsapp: string;
      finalReportAssignedTo: string;
      finalReportAssignedToPhoneNumber: string;
      finalReportAssignedToEmail: string;
      finalReportAssignedToWhatsapp: string;
      redFlag: string;
      remarks: string;
      name: string;
      valuationType: string;
    }>
  ): Observable<void> {
    const url = `${environment.apiBaseUrl}valuations/${valuationId}/workflow/Table`;

    // Always include these identifiers
    const body: any = {
      valuationId,
      vehicleNumber,
      applicantContact,
      ...fields
    };

    return this.http.put<void>(url, body, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  getWorkflowStatus(valuationId: string, vehicleNumber: string, applicantContact: string, valuationType: string): Observable<any> {
    const url = `${this.baseUrl}/${valuationId}/workflow`;
    const params = new HttpParams()
      .set('vehicleNumber', vehicleNumber)
      .set('applicantContact', applicantContact)
      .set('valuationType', valuationType);

    return this.http.get<any>(url, { params })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          // normalize or rethrow
          return throwError(() => err);
        })
      );
  }

  getTable(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string
  ): Observable<WorkflowTable> {
    const url = `${this.baseUrl}/${valuationId}/workflow/Table`;
    return this.http.get<WorkflowTable>(url, {
      params: { vehicleNumber, applicantContact }
    });
  }
}

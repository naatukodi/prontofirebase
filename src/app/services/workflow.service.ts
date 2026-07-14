// src/app/services/workflow.service.ts
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
  private readonly paymentUrl = environment.apiBaseUrl + 'payments';

  constructor(private http: HttpClient) {}

  // ===============================
  // START WORKFLOW
  // ===============================
  startWorkflow(
    valuationId: string,
    stepOrder: number,
    vehicleNumber: string,
    applicantContact: string
  ): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/${valuationId}/workflow/${stepOrder}/start?vehicleNumber=${vehicleNumber}&applicantContact=${applicantContact}`,
      null
    );
  }

  // ===============================
  // COMPLETE WORKFLOW
  // ===============================
  completeWorkflow(
    valuationId: string,
    stepOrder: number,
    vehicleNumber: string,
    applicantContact: string,
    approvedBy?: string
  ): Observable<void> {
    let url = `${this.baseUrl}/${valuationId}/workflow/${stepOrder}/complete?vehicleNumber=${vehicleNumber}&applicantContact=${applicantContact}`;
    if (approvedBy) url += `&approvedBy=${encodeURIComponent(approvedBy)}`;
    return this.http.post<void>(url, null);
  }

  // ===============================
  // UPDATE WORKFLOW TABLE
  // (NO PAYMENT FIELDS HERE)
  // ===============================
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

    const url = `${this.baseUrl}/${valuationId}/workflow/Table`;

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

  // ===============================
  // ✅ SAVE PAYMENT (NEW SEPARATE API)
  // ===============================
  savePayment(data: {
    valuationId: string;
    vehicleNumber: string;
    applicantContact: string;
    paymentStatus: string;
    paymentReference?: string;
    paymentDate: string | null;
    paymentMethod: string;
    paymentAmount: number;
    paymentNotes?: string;
    savedBy?: string;
  }): Observable<any> {

    return this.http.put<any>(
      this.paymentUrl,
      data,
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  getPayment(valuationId: string): Observable<any> {
    return this.http.get<any>(
      `${environment.apiBaseUrl}payments/${valuationId}`
    );
  }


  // ===============================
  // GET WORKFLOW STATUS
  // ===============================
  getWorkflowStatus(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string,
    valuationType: string
  ): Observable<any> {

    const url = `${this.baseUrl}/${valuationId}/workflow`;

    const params = new HttpParams()
      .set('vehicleNumber', vehicleNumber)
      .set('applicantContact', applicantContact)
      .set('valuationType', valuationType);

    return this.http.get<any>(url, { params })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          return throwError(() => err);
        })
      );
  }

  // ===============================
  // GET WORKFLOW TABLE
  // ===============================
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

  // ===============================
  // RETURN WORKFLOW
  // ===============================
  returnWorkflow(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string,
    currentStep: string,
    returnReason: string,
    currentUserId: string,
    currentUserName: string,
    targetReturnStep: string,
    overrideAssigneeId: string = ""
  ): Observable<void> {

    const url = `${this.baseUrl}/${valuationId}/workflow/return`;

    const body = {
      valuationId,
      vehicleNumber,
      applicantContact,
      currentStep,
      returnReason,
      currentUserId,
      currentUserName,
      targetReturnStep,
      overrideAssigneeId
    };

    return this.http.post<void>(url, body);
  }

  // ===============================
  // GET CASE HISTORY
  // ===============================
  getHistory(valuationId: string): Observable<any[]> {
    const url = `${this.baseUrl}/${valuationId}/workflow/gethistory`;
    return this.http.get<any[]>(url);
  }
}

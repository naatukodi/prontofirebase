// src/app/services/valuation.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs'; // ✅ ADD 'of'
import { catchError } from 'rxjs/operators';    
import { VehicleDetails } from '../models/VehicleDetails';
import { WorkflowService } from '../services/workflow.service';
import { environment } from '../../environments/environment';
import { FinalReport } from '../models/final-report.model';

import { 
  VehicleDuplicateCheckResponse, 
  ExistingVehicleRecord 
} from '../models/vehicle-duplicate-check.interface';

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
          return throwError(() => err);
        })
      );
  }

  assignValuation(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string,
    name: string,
    phone: string,
    email: string,
    whatsapp: string
  ): Observable<void> {
    const url = `${this.baseUrl}/${valuationId}/valuationresponse/assignment`
      + `?valuationId=${encodeURIComponent(valuationId)}`
      + `&vehicleNumber=${encodeURIComponent(vehicleNumber)}`
      + `&applicantContact=${encodeURIComponent(applicantContact)}`
      + `&assignedTo=${encodeURIComponent(name)}`
      + `&assignedToPhoneNumber=${encodeURIComponent(phone)}`
      + `&assignedToEmail=${encodeURIComponent(email)}`
      + `&assignedToWhatsapp=${encodeURIComponent(whatsapp)}`;
    return this.http.post<void>(url, '');
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

  // ✅ DUPLICATE CHECK METHOD (FIXED)
  /**
   * Check if vehicle number, engine number, or chassis number already exists in the system
   * @param vehicleNumber - Vehicle registration number
   * @param engineNumber - Engine number
   * @param chassisNumber - Chassis number (VIN)
   * @returns Observable with duplicate check response
   */
  checkDuplicateVehicle(
    vehicleNumber?: string,
    engineNumber?: string,
    chassisNumber?: string
  ): Observable<VehicleDuplicateCheckResponse> {
    let params = new HttpParams();
    
    if (vehicleNumber?.trim()) {
      params = params.set('vehicleNumber', vehicleNumber.trim());
    }
    if (engineNumber?.trim()) {
      params = params.set('engineNumber', engineNumber.trim());
    }
    if (chassisNumber?.trim()) {
      params = params.set('chassisNumber', chassisNumber.trim());
    }

    // ✅ USE this.baseUrl (already includes /api/valuations)
    const url = `${this.baseUrl}/check-duplicate`;
    
    return this.http.get<VehicleDuplicateCheckResponse>(url, { params })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          console.error('Error checking duplicates:', err);
          // ✅ RETURN SAFE DEFAULT INSTEAD OF ERROR
          return of({
            isDuplicate: false,
            isVehicleNumberExists: false,
            isEngineNumberExists: false,
            isChassisNumberExists: false,
            totalDuplicatesFound: 0,
            messages: [],
            existingRecords: []
          });
        })
      );
  }

  assignUser(valuationId: string, userId: string): Observable<any> {
    const url = `${this.baseUrl}/${valuationId}/assign`;
    return this.http.post(url, { userId });
  }
}

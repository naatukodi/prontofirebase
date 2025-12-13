// src/app/services/vehicle-inspection.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams, HttpEvent } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { WorkflowService } from './workflow.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VehicleInspectionService {
  private readonly baseUrl = environment.apiBaseUrl + 'valuations';

  constructor(private http: HttpClient, private workflowService: WorkflowService) {}

  // ✅ FIXED: uploadPhotos now handles VIDEOS correctly
  async uploadPhotos(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string,
    formData: FormData,
    options: any = {}
  ): Promise<Observable<HttpEvent<any>>> {
    
    // Create a new container for the data we will actually send
    const compressedFormData = new FormData();
    
    // 1. Append Text Data
    compressedFormData.append('valuationId', valuationId);
    compressedFormData.append('vehicleNumber', vehicleNumber);
    compressedFormData.append('applicantContact', applicantContact);

    // 2. Iterate through formData to filter & compress
    for (const [key, value] of (formData as any).entries()) {
      
      if (value instanceof File) {
        // CASE A: It is a Large Image -> Compress it
        if (value.type.startsWith('image/') && value.size > 500 * 1024) {
             const compressedFile = await this.compressImage(value, 0.5); // 0.5 quality
             compressedFormData.append(key, compressedFile, compressedFile.name);
        } 
        // CASE B: It is a VIDEO or small Image -> Add it directly!
        // (This was missing before, causing videos to be skipped)
        else {
             compressedFormData.append(key, value, value.name);
        }
      } 
      // CASE C: It is a String (metadata)
      else if (typeof value === 'string') {
        compressedFormData.append(key, value);
      }
    }

    const params = new HttpParams()
      .set('vehicleNumber', vehicleNumber)
      .set('applicantContact', applicantContact);

    // ✅ Using PUT as requested
    return this.http.put<HttpEvent<any>>(
      `${this.baseUrl}/${valuationId}/photos`,
      compressedFormData,
      { ...options, params, reportProgress: true, observe: 'events' }
    ).pipe(catchError(this.handleError));
  }

  // Helper function to compress an image file
  private compressImage(file: File, quality: number): Promise<File> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event: any) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, { type: file.type });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            file.type,
            quality
          );
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  getVehicleImages(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string
  ): Observable<any> {
    const params = new HttpParams()
      .set('vehicleNumber', vehicleNumber)
      .set('applicantContact', applicantContact);

    return this.http.get<any>(
      `${this.baseUrl}/${valuationId}/photos`,
      { params }
    ).pipe(catchError(this.handleError));
  }

  /**
   * ✅ Check if all mandatory photos are uploaded
   * Returns: { isComplete: boolean, missingPhotos: string[] }
   */
  checkMandatoryPhotos(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string
  ): Observable<{ isComplete: boolean; missingPhotos: string[] }> {
    const params = new HttpParams()
      .set('vehicleNumber', vehicleNumber)
      .set('applicantContact', applicantContact);

    return this.http.get<{ isComplete: boolean; missingPhotos: string[] }>(
      `${this.baseUrl}/${valuationId}/photos/validate`,
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  deleteVehicleImage(
    valuationId: string,
    imageName: string
  ): Observable<any> {
    return this.http.delete<any>(
      `${this.baseUrl}/${valuationId}/photos/${imageName}`
    ).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('An error occurred:', error);
    return throwError('Something went wrong; please try again later.');
  }
}
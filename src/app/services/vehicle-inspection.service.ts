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

  // Add methods for vehicle image upload
  async uploadPhotos(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string,
    formData: FormData,
    options: any = {}
  ): Promise<Observable<HttpEvent<any>>> {
    // Compress images before appending to FormData
    const compressedFormData = new FormData();
    compressedFormData.append('valuationId', valuationId);
    compressedFormData.append('vehicleNumber', vehicleNumber);
    compressedFormData.append('applicantContact', applicantContact);

    // Iterate through formData and compress images
    for (const [key, value] of (formData as any).entries()) {
      if (value instanceof File && value.type.startsWith('image/')) {
      if (value.size > 500 * 1024) { // Only compress if size > 500KB
        const compressedFile = await this.compressImage(value, 0.5); // 0.5 quality
        compressedFormData.append(key, compressedFile, compressedFile.name);
      } else {
        compressedFormData.append(key, value, value.name);
      }
      } else if (typeof value === 'string') {
      compressedFormData.append(key, value);
      }
    }

    const params = new HttpParams()
      .set('vehicleNumber', vehicleNumber)
      .set('applicantContact', applicantContact);

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
 * ✅ NEW METHOD: Check if all mandatory photos are uploaded
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
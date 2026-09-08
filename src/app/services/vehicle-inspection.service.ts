// src/app/services/vehicle-inspection.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams, HttpEvent } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { WorkflowService } from './workflow.service';
import { environment } from '../../environments/environment';

// Per-photo metadata stored by the backend. Date/location are captured and
// burned in by the camera app now, so the portal only reads the annotation note.
export interface PhotoMetadata {
  annotationNote?: string;
  originalPhotoUrl?: string;
  /** Whether the case's company wordmark is currently burned onto this photo. */
  logoApplied?: boolean;
}

export interface SavedCustomPhoto {
  id: string;
  name: string;
  photoUrl: string;
  dateCaptured?: string;
  location?: string;
  annotationNote?: string;
  originalPhotoUrl?: string;
  logoApplied?: boolean;
}

/** Outcome of stamping (or clearing) the company wordmark across a case's photos. */
export interface BrandLogoResult {
  /** Resolved from the case itself, never chosen by the portal: 'vehga' | 'pronto'. */
  brand: string;
  applied: boolean;
  /** Photos actually redrawn — ones already in the requested state are skipped. */
  changed: number;
  failed: number;
  /** New URL per photo key, so thumbnails refresh without reloading the case. */
  photoUrls: Record<string, string>;
}

@Injectable({
  providedIn: 'root'
})
export class VehicleInspectionService {
  private readonly baseUrl = environment.apiBaseUrl + 'valuations';

  constructor(private http: HttpClient, private workflowService: WorkflowService) {}

  // ... (Existing uploadPhotos method - NO CHANGES) ...
  async uploadPhotos(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string,
    formData: FormData,
    options: any = {}
  ): Promise<Observable<HttpEvent<any>>> {
    const compressedFormData = new FormData();
    compressedFormData.append('valuationId', valuationId);
    compressedFormData.append('vehicleNumber', vehicleNumber);
    compressedFormData.append('applicantContact', applicantContact);

    for (const [key, value] of (formData as any).entries()) {
      if (value instanceof File) {
        if (value.type.startsWith('image/') && value.size > 500 * 1024) {
             const compressedFile = await this.compressImage(value, 0.5);
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

  // ... (Existing compressImage method - NO CHANGES) ...
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

  // ... (Existing getVehicleImages method - NO CHANGES) ...
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

  // ... (Existing checkMandatoryPhotos method - NO CHANGES) ...
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

  getCustomPhotos(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string
  ): Observable<SavedCustomPhoto[]> {
    const params = new HttpParams()
      .set('vehicleNumber', vehicleNumber)
      .set('applicantContact', applicantContact);
    return this.http.get<SavedCustomPhoto[]>(
      `${this.baseUrl}/${valuationId}/photos/custom`,
      { params }
    ).pipe(catchError(this.handleError));
  }

  /**
   * Link for the bulk photo download. Deliberately a URL rather than a request: the
   * endpoint answers with Content-Disposition, so letting the browser navigate to it
   * downloads the archive without an XHR — and a navigation needs no CORS entry, which
   * the deployed portal origin does not have on the API.
   */
  photosDownloadUrl(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string
  ): string {
    const params = new HttpParams()
      .set('vehicleNumber', vehicleNumber)
      .set('applicantContact', applicantContact);
    return `${this.baseUrl}/${valuationId}/photos/download?${params.toString()}`;
  }

  annotatePhoto(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string,
    photoKey: string,
    note: string
  ): Observable<{ photoUrl: string; note: string }> {
    const params = new HttpParams()
      .set('vehicleNumber', vehicleNumber)
      .set('applicantContact', applicantContact);
    return this.http.put<{ photoUrl: string; note: string }>(
      `${this.baseUrl}/${valuationId}/photos/${photoKey}/annotate`,
      { note },
      { params }
    ).pipe(catchError(this.handleError));
  }

  /**
   * Stamps the case's company wordmark onto every photo, or clears it.
   *
   * No brand is sent: the backend reads it off the case, so a Pronto case gets the
   * Pronto mark whichever company's operator presses the button. Compositing is
   * server-side because the blob container serves no CORS headers, which would
   * taint a browser canvas drawing these images.
   */
  applyBrandLogo(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string,
    apply: boolean
  ): Observable<BrandLogoResult> {
    const params = new HttpParams()
      .set('vehicleNumber', vehicleNumber)
      .set('applicantContact', applicantContact);
    return this.http.put<BrandLogoResult>(
      `${this.baseUrl}/${valuationId}/photos/logo`,
      { apply },
      { params }
    ).pipe(catchError(this.handleError));
  }

  deleteVehicleImage(
    valuationId: string,
    imageName: string
  ): Observable<any> {
    return this.http.delete<any>(
      `${this.baseUrl}/${valuationId}/photos/${imageName}`
    ).pipe(catchError(this.handleError));
  }

  // Per-photo metadata (used to pre-fill annotation notes in the pencil modal)
  getPhotoMetadata(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string
  ): Observable<Record<string, PhotoMetadata>> {
    const params = new HttpParams()
      .set('vehicleNumber', vehicleNumber)
      .set('applicantContact', applicantContact);
    return this.http.get<Record<string, PhotoMetadata>>(
      `${this.baseUrl}/${valuationId}/photos/metadata`,
      { params }
    ).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('An error occurred:', error);
    return throwError('Something went wrong; please try again later.');
  }
}
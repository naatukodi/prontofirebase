// src/app/vehicle-image-upload/vehicle-image-upload.component.ts

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpEvent, HttpEventType, HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { VehicleInspectionService, PhotoMetadata } from '../../../services/vehicle-inspection.service';
import { WorkflowButtonsComponent } from '../../workflow-buttons/workflow-buttons.component';
import { SharedModule } from '../../shared/shared.module/shared.module';
import { AuthorizationService } from '../../../services/authorization.service';
import { RouterModule } from '@angular/router';
import { Auth, User, authState } from '@angular/fire/auth';
import { take } from 'rxjs/operators';
import { FormsModule } from '@angular/forms'; 

import { HistoryLoggerService } from '../../../services/history-logger.service';

type ImageKey =
  | 'frontLeftSide' | 'frontRightSide' | 'rearLeftSide' | 'rearRightSide'
  | 'frontViewGrille' | 'rearViewTailgate' | 'driverSideProfile' | 'passengerSideProfile'
  | 'dashboard' | 'instrumentCluster' | 'engineBay'
  | 'chassisNumberPlate' | 'chassisImprint' | 'gearAndSeats'
  | 'dashboardCloseup' | 'odometer' | 'selfieWithVehicle'
  | 'underbody' | 'tiresAndRims';

type MediaKey = ImageKey | 'vehicleVideo';

interface MediaField {
  key: MediaKey;
  label: string;
  type: 'image' | 'video';
  optional: boolean;
}

@Component({
  selector: 'app-vehicle-image-upload',
  imports: [SharedModule, WorkflowButtonsComponent, RouterModule, FormsModule],
  standalone: true,
  templateUrl: './vehicle-image-upload.component.html',
  styleUrls: ['./vehicle-image-upload.component.scss']
})
export class VehicleImageUploadComponent implements OnInit {
  valuationId!: string;
  vehicleNumber!: string;
  applicantContact!: string;
  valuationType!: string;
  error: string | null = null;

  private authz = new AuthorizationService();
  private currentUser: User | null = null;
  private currentUserId: string = 'unknown';
  private currentUserName: string = 'Unknown User';
  private uploadedMediaTracker: MediaKey[] = [];

  // Metadata Storage
  mediaMetadata: Record<string, PhotoMetadata> = {};

  mediaFields: MediaField[] = [
    { key: 'frontLeftSide',       label: 'Front Left Side',                    type: 'image', optional: false },
    { key: 'frontRightSide',      label: 'Front Right Side',                   type: 'image', optional: false },
    { key: 'rearLeftSide',        label: 'Rear Left Side',                     type: 'image', optional: false },
    { key: 'rearRightSide',       label: 'Rear Right Side',                    type: 'image', optional: false },
    { key: 'frontViewGrille',     label: 'Front View (grille)',                type: 'image', optional: false },
    { key: 'rearViewTailgate',    label: 'Rear View (tailgate)',               type: 'image', optional: false },
    { key: 'driverSideProfile',   label: 'Driver\'s Side Profile',             type: 'image', optional: false },
    { key: 'passengerSideProfile',label: 'Passenger Side Profile',             type: 'image', optional: false },
    { key: 'dashboard',           label: 'Dashboard',                          type: 'image', optional: false },
    { key: 'instrumentCluster',   label: 'Instrument Cluster / Odometer',      type: 'image', optional: false },
    { key: 'engineBay',           label: 'Engine Bay',                         type: 'image', optional: false },
    { key: 'chassisNumberPlate',  label: 'Chassis Number Plate',               type: 'image', optional: false },
    { key: 'chassisImprint',      label: 'Chassis Imprint (scratched on metal)',type: 'image', optional: false },
    { key: 'gearAndSeats',        label: 'Gear and Seats (interior)',          type: 'image', optional: false },
    { key: 'dashboardCloseup',    label: 'Dashboard Close-up (controls)',      type: 'image', optional: false },
    { key: 'odometer',            label: 'Odometer',                           type: 'image', optional: false },
    { key: 'selfieWithVehicle',   label: 'Selfie of Inspector with Vehicle',   type: 'image', optional: false },
    { key: 'underbody',           label: 'Underbody',                          type: 'image', optional: true  },
    { key: 'tiresAndRims',        label: 'Tires and Rims',                     type: 'image', optional: false },
    { key: 'vehicleVideo',        label: 'Vehicle Video',                      type: 'video', optional: false }
  ];

  selectedFiles: Record<MediaKey, File | null> = this.initRecord(null);
  uploadedUrls: Record<MediaKey, string | null> = this.initRecord(null);
  uploadProgress: Partial<Record<MediaKey, number>> = {};
  isUploading:    Partial<Record<MediaKey, boolean>> = {};
  uploadError:    Partial<Record<MediaKey, string>> = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vehicleInspectionService: VehicleInspectionService,
    private cdr: ChangeDetectorRef,
    private auth: Auth,
    private historyLogger: HistoryLoggerService
  ) {
    this.mediaFields.forEach(f => {
        this.mediaMetadata[f.key] = { capturedDate: '', locationText: '' };
    });
  }

  private initRecord(val: any): any {
    const rec: any = {};
    this.mediaFields.forEach(f => rec[f.key] = val);
    return rec;
  }

  ngOnInit(): void {
    this.valuationId = this.route.snapshot.paramMap.get('valuationId') || '';
    if (!this.valuationId) {
      this.error = 'Missing valuationId in route.';
      return;
    }

    authState(this.auth).pipe(take(1)).subscribe(u => {
      this.currentUser = u;
      if (u) {
        this.currentUserId = u.uid || u.phoneNumber || 'unknown';
        this.currentUserName = u.displayName || u.email?.split('@')[0] || 'Unknown User';
      }
    });

    this.route.queryParamMap.subscribe(params => {
      const vn = params.get('vehicleNumber');
      const ac = params.get('applicantContact');
      this.valuationType = params.get('valuationType')!;
      if (vn && ac) {
        this.vehicleNumber = vn;
        this.applicantContact = ac;
        this.loadExistingMedia();
        this.loadExistingMetadata();
      } else {
        this.error = 'Missing vehicleNumber or applicantContact in query parameters.';
      }
    });
  }

  private loadExistingMedia(): void {
    this.vehicleInspectionService
      .getVehicleImages(this.valuationId, this.vehicleNumber, this.applicantContact)
      .subscribe({
        next: (map: Record<string,string>) => {
          Object.keys(map).forEach((key) => {
            const normalizedKey = key.charAt(0).toLowerCase() + key.slice(1);
            if ((this.uploadedUrls as any)[normalizedKey] !== undefined) {
              (this.uploadedUrls as any)[normalizedKey] = map[key];
            }
          });
          this.cdr.detectChanges();
        },
        error: (err) => console.warn('No existing media', err)
      });
  }

  // ✅ LOAD METADATA & CONVERT TIMEZONE
  private loadExistingMetadata(): void {
    this.vehicleInspectionService.getPhotoMetadata(this.valuationId).subscribe({
        next: (data) => {
            if(data) {
                Object.keys(data).forEach(key => {
                    const normalizedKey = key.charAt(0).toLowerCase() + key.slice(1);
                    if(this.mediaMetadata[normalizedKey]) {
                        let dateVal = data[key].capturedDate;
                        // FIX: Convert UTC to Local Time so it displays correctly
                        if(dateVal) {
                            const dateObj = new Date(dateVal);
                            const localTime = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000));
                            dateVal = localTime.toISOString().slice(0, 16);
                        }
                        this.mediaMetadata[normalizedKey] = {
                            capturedDate: dateVal,
                            locationText: data[key].locationText
                        };
                    }
                });
            }
        },
        error: (err) => console.warn('Failed to load metadata', err)
    });
  }

  // ✅ SAVE METADATA (With Sanitization)
  saveMetadata(fieldKey: string) {
    const meta = this.mediaMetadata[fieldKey];
    if(!meta) return;

    // Convert empty string back to undefined to avoid backend 400 error
    const payload: PhotoMetadata = {
        capturedDate: meta.capturedDate ? meta.capturedDate : undefined, 
        locationText: meta.locationText
    };

    console.log(`Saving metadata for ${fieldKey}:`, payload);

    this.vehicleInspectionService.updatePhotoMetadata(this.valuationId, fieldKey, payload)
        .subscribe({
            next: () => alert(`Details saved for ${this.getLabel(fieldKey as MediaKey)}`),
            error: (err) => {
                const msg = err.error?.message || err.statusText || 'Unknown error';
                alert(`Failed to save details: ${msg}`);
            }
        });
  }

  onFileSelected(event: Event, fieldKey: MediaKey) {
    const inputEl = event.target as HTMLInputElement;
    if (!inputEl.files || inputEl.files.length === 0) {
      this.selectedFiles[fieldKey] = null;
      return;
    }
    this.selectedFiles[fieldKey] = inputEl.files[0];
    this.uploadError[fieldKey] = undefined;
  }

  private buildSingleFormData(fieldKey: MediaKey): FormData {
    const formData = new FormData();
    const file = this.selectedFiles[fieldKey]!;
    formData.append(fieldKey, file, file.name);
    return formData;
  }

  // ✅ UPLOAD MEDIA (With Loop Fix)
  async uploadMedia(fieldKey: MediaKey) {
    const fieldMeta = this.mediaFields.find(f => f.key === fieldKey);
    if (!fieldMeta) return;

    if (!this.selectedFiles[fieldKey] && !fieldMeta.optional) {
      this.uploadError[fieldKey] = `Please select "${fieldMeta.label}" ${fieldMeta.type}.`;
      return;
    }
    if (!this.selectedFiles[fieldKey] && this.uploadedUrls[fieldKey]) {
      return;
    }

    this.uploadProgress[fieldKey] = 0;
    this.isUploading[fieldKey] = true;
    this.uploadError[fieldKey] = undefined;

    const payload = this.buildSingleFormData(fieldKey);

    try {
      const observable = await this.vehicleInspectionService.uploadPhotos(
        this.valuationId,
        this.vehicleNumber,
        this.applicantContact,
        payload,
        { reportProgress: true, observe: 'events' }
      );

      observable.pipe(
        finalize(() => {
          this.isUploading[fieldKey] = false;
        })
      ).subscribe({
        next: (event: HttpEvent<any>) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            this.uploadProgress[fieldKey] = Math.round((100 * event.loaded) / event.total);
          }
          else if (event.type === HttpEventType.Response) {
            const bodyMap = event.body as Record<string,string>;
            
            // 1. Update all image previews (Backend returns full list)
            Object.keys(bodyMap).forEach((returnedKey) => {
              const normalizedKey = returnedKey.charAt(0).toLowerCase() + returnedKey.slice(1);
              const targetKey: MediaKey = normalizedKey === 'video' ? 'vehicleVideo' :
                                          normalizedKey === 'vehiclevideo' ? 'vehicleVideo' :
                                          (normalizedKey as MediaKey);

              if ((this.uploadedUrls as any)[targetKey] !== undefined) {
                const rawUrl = bodyMap[returnedKey];
                const busted = `${rawUrl}?t=${new Date().getTime()}`;
                (this.uploadedUrls as any)[targetKey] = busted;
                this.cdr.detectChanges();

                if (!this.uploadedMediaTracker.includes(targetKey)) {
                  this.uploadedMediaTracker.push(targetKey);
                }
              }
            });

            // ✅ FIX: Only update Location/Date for the CURRENT file (fieldKey)
            // (Moved outside the loop so we don't overwrite every other image)
            this.captureLocationAndSave(fieldKey);

            this.uploadProgress[fieldKey] = 100;
            this.selectedFiles[fieldKey] = null;
          }
        },
        error: (err: HttpErrorResponse) => {
          this.uploadError[fieldKey] = err.error?.message || 'Upload failed.';
        }
      });
    }
    catch (err: any) {
      this.isUploading[fieldKey] = false;
      this.uploadError[fieldKey] = err?.message || 'Upload failed.';
    }
  }

  // ✅ CAPTURE LOCATION (Browser Geolocation + OpenStreetMap)
  private captureLocationAndSave(key: string) {
    if (!this.mediaMetadata[key]) return;

    // 1. Set Date (Local Time)
    const now = new Date();
    const localIsoTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    this.mediaMetadata[key].capturedDate = localIsoTime;

    // 2. Fetch Location
    if (navigator.geolocation) {
        this.mediaMetadata[key].locationText = 'Fetching location...';
        this.cdr.detectChanges(); 

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                try {
                    // Reverse Geocode
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                    const data = await response.json();

                    const address = data.address;
                    // Try to construct a readable address: "Area, City, State"
                    const parts = [
                        address.suburb || address.neighbourhood || address.road,
                        address.city || address.town || address.village,
                        address.state
                    ].filter(Boolean);

                    this.mediaMetadata[key].locationText = parts.length > 0 ? parts.join(', ') : `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
                
                } catch (err) {
                    console.warn('Reverse geocoding failed', err);
                    this.mediaMetadata[key].locationText = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
                }

                // Force UI update & Save
                this.cdr.detectChanges();
                this.saveMetadata(key);
            },
            (err) => {
                console.warn('Geolocation denied', err);
                const errorMsg = err.code === 1 ? 'Location Access Denied' : 'Location Unavailable';
                this.mediaMetadata[key].locationText = errorMsg;
                this.cdr.detectChanges();
                this.saveMetadata(key);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        this.mediaMetadata[key].locationText = 'No GPS Support';
        this.saveMetadata(key);
    }
  }

  getLabel(fieldKey: MediaKey): string {
    return this.mediaFields.find(f => f.key === fieldKey)?.label || fieldKey;
  }

  openMedia(url: string): void {
    window.open(url, '_blank');
  }

  onBack(): void {
    if (this.uploadedMediaTracker.length > 0) {
      const mediaNames = this.uploadedMediaTracker.map(k => this.getLabel(k)).join(', ');

      this.historyLogger.logAction(
        this.valuationId,
        'Vehicle Media Upload Session Completed',
        `${this.uploadedMediaTracker.length} media file(s) uploaded: ${mediaNames}`,
        this.currentUserId,
        this.currentUserName,
        null,
        'AVO'
      ).then(() => this.navigateBack()).catch(() => this.navigateBack());
    } else {
      this.navigateBack();
    }
  }

  private navigateBack(): void {
    this.router.navigate(['/valuation', this.valuationId, 'inspection', 'update'], {
      queryParams: {
        vehicleNumber: this.vehicleNumber,
        applicantContact: this.applicantContact,
        valuationType: this.valuationType
      }
    });
  }

  canEditInspection() {
    return this.authz.hasAnyPermission(['CanCreateInspection', 'CanEditInspection']);
  }
}
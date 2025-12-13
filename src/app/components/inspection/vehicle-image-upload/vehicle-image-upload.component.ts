// src/app/vehicle-image-upload/vehicle-image-upload.component.ts

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpEvent, HttpEventType, HttpErrorResponse } from '@angular/common/http';
import { finalize, take } from 'rxjs/operators';
import { VehicleInspectionService } from '../../../services/vehicle-inspection.service';
import { WorkflowButtonsComponent } from '../../workflow-buttons/workflow-buttons.component';
import { AuthorizationService } from '../../../services/authorization.service';
import { Auth, User, authState } from '@angular/fire/auth';

// Angular common + Material (standalone)
import { NgIf, NgForOf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

// History logger
import { HistoryLoggerService } from '../../../services/history-logger.service';

// ---------- KEYS & FIELD METADATA ----------

type ImageKey =
  | 'frontLeftSide'
  | 'frontRightSide'
  | 'rearLeftSide'
  | 'rearRightSide'
  | 'frontViewGrille'
  | 'rearViewTailgate'
  | 'driverSideProfile'
  | 'passengerSideProfile'
  | 'dashboard'
  | 'instrumentCluster'
  | 'engineBay'
  | 'chassisNumberPlate'
  | 'chassisImprint'
  | 'gearAndSeats'
  | 'dashboardCloseup'
  | 'odometer'
  | 'selfieWithVehicle'
  | 'underbody'
  | 'tiresAndRims';

type MediaKey = ImageKey | 'vehicleVideo';

interface MediaField {
  key: MediaKey;
  label: string;
  type: 'image' | 'video';
  optional: boolean;
}

@Component({
  selector: 'app-vehicle-image-upload',
  standalone: true,
  imports: [
    NgIf,
    NgForOf,
    MatButtonModule,
    WorkflowButtonsComponent,
    RouterModule
  ],
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

  mediaFields: MediaField[] = [
    { key: 'frontLeftSide',        label: 'Front Left Side',                       type: 'image', optional: false },
    { key: 'frontRightSide',       label: 'Front Right Side',                      type: 'image', optional: false },
    { key: 'rearLeftSide',         label: 'Rear Left Side',                        type: 'image', optional: false },
    { key: 'rearRightSide',        label: 'Rear Right Side',                       type: 'image', optional: false },
    { key: 'frontViewGrille',      label: 'Front View (grille)',                   type: 'image', optional: false },
    { key: 'rearViewTailgate',     label: 'Rear View (tailgate)',                  type: 'image', optional: false },
    { key: 'driverSideProfile',    label: 'Driver\'s Side Profile',                type: 'image', optional: false },
    { key: 'passengerSideProfile', label: 'Passenger Side Profile',                type: 'image', optional: false },
    { key: 'dashboard',            label: 'Dashboard',                             type: 'image', optional: false },
    { key: 'instrumentCluster',    label: 'Instrument Cluster / Odometer',         type: 'image', optional: false },
    { key: 'engineBay',            label: 'Engine Bay',                            type: 'image', optional: false },
    { key: 'chassisNumberPlate',   label: 'Chassis Number Plate',                  type: 'image', optional: false },
    { key: 'chassisImprint',       label: 'Chassis Imprint (scratched on metal)',  type: 'image', optional: false },
    { key: 'gearAndSeats',         label: 'Gear and Seats (interior)',             type: 'image', optional: false },
    { key: 'dashboardCloseup',     label: 'Dashboard Close-up (controls)',         type: 'image', optional: false },
    { key: 'odometer',             label: 'Odometer',                              type: 'image', optional: false },
    { key: 'selfieWithVehicle',    label: 'Selfie of Inspector with Vehicle',      type: 'image', optional: false },
    { key: 'underbody',            label: 'Underbody',                             type: 'image', optional: true  },
    { key: 'tiresAndRims',         label: 'Tires and Rims',                        type: 'image', optional: false },
    { key: 'vehicleVideo',         label: 'Vehicle Video',                         type: 'video', optional: false }
  ];

  selectedFiles: Record<MediaKey, File | null> = {
    frontLeftSide:        null,
    frontRightSide:       null,
    rearLeftSide:         null,
    rearRightSide:        null,
    frontViewGrille:      null,
    rearViewTailgate:     null,
    driverSideProfile:    null,
    passengerSideProfile: null,
    dashboard:            null,
    instrumentCluster:    null,
    engineBay:            null,
    chassisNumberPlate:   null,
    chassisImprint:       null,
    gearAndSeats:         null,
    dashboardCloseup:     null,
    odometer:             null,
    selfieWithVehicle:    null,
    underbody:            null,
    tiresAndRims:         null,
    vehicleVideo:         null
  };

  uploadedUrls: Record<MediaKey, string | null> = {
    frontLeftSide:        null,
    frontRightSide:       null,
    rearLeftSide:         null,
    rearRightSide:        null,
    frontViewGrille:      null,
    rearViewTailgate:     null,
    driverSideProfile:    null,
    passengerSideProfile: null,
    dashboard:            null,
    instrumentCluster:    null,
    engineBay:            null,
    chassisNumberPlate:   null,
    chassisImprint:       null,
    gearAndSeats:         null,
    dashboardCloseup:     null,
    odometer:             null,
    selfieWithVehicle:    null,
    underbody:            null,
    tiresAndRims:         null,
    vehicleVideo:         null
  };

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
  ) {}

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
      this.valuationType = params.get('valuationType') || '';
      if (vn && ac) {
        this.vehicleNumber = vn;
        this.applicantContact = ac;
        this.loadExistingMedia();
      } else {
        this.error = 'Missing vehicleNumber or applicantContact in query parameters.';
      }
    });
  }

  // ---------- LOAD EXISTING MEDIA ----------

  private loadExistingMedia(): void {
    this.vehicleInspectionService
      .getVehicleImages(this.valuationId, this.vehicleNumber, this.applicantContact)
      .subscribe({
        next: (map: Record<string, string>) => {
          Object.keys(map).forEach((key) => {
            if (key === 'VehicleVideo') {
              this.uploadedUrls['vehicleVideo'] = map[key];
              return;
            }

            const normalizedKey = key.charAt(0).toLowerCase() + key.slice(1);
            if ((this.uploadedUrls as any)[normalizedKey] !== undefined) {
              (this.uploadedUrls as any)[normalizedKey] = map[key];
            }
          });
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.warn('No existing media or error fetching them', err);
        }
      });
  }

  // ---------- FILE SELECTION ----------

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
    console.log('buildSingleFormData for', fieldKey, 'file =', file);
    const backendKey =
      fieldKey === 'vehicleVideo'
        ? 'VehicleVideo'
        : fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1);
    formData.append(backendKey, file, file.name);
    formData.append('ValuationId', this.valuationId);
    formData.append('VehicleNumber', this.vehicleNumber);
    formData.append('ApplicantContact', this.applicantContact);
    return formData;
  }

  // ---------- UPLOAD (images + video use same pipeline) ----------

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

      observable
        .pipe(finalize(() => { this.isUploading[fieldKey] = false; }))
        .subscribe({
          next: (event: HttpEvent<any>) => {
            if (event.type === HttpEventType.UploadProgress && event.total) {
              this.uploadProgress[fieldKey] = Math.round((100 * event.loaded) / event.total);
            } else if (event.type === HttpEventType.Response) {
              const bodyMap = event.body as Record<string, string>;
              console.log('Upload response keys:', Object.keys(bodyMap));

              Object.keys(bodyMap).forEach((returnedKey) => {
                let targetKey: MediaKey | null = null;

                if (returnedKey === 'VehicleVideo') {
                  targetKey = 'vehicleVideo';
                } else {
                  const normalizedKey = returnedKey.charAt(0).toLowerCase() + returnedKey.slice(1);
                  if ((this.uploadedUrls as any)[normalizedKey] !== undefined) {
                    targetKey = normalizedKey as MediaKey;
                  }
                }

                if (!targetKey) return;

                const rawUrl = bodyMap[returnedKey];
                const busted = `${rawUrl}?t=${new Date().getTime()}`;

                (this.uploadedUrls as any)[targetKey] = null;
                this.cdr.detectChanges();

                setTimeout(() => {
                  (this.uploadedUrls as any)[targetKey] = busted;
                  this.cdr.detectChanges();
                }, 0);

                if (!this.uploadedMediaTracker.includes(targetKey)) {
                  this.uploadedMediaTracker.push(targetKey);
                  console.log(`📁 Tracked: ${this.getLabel(targetKey)}`);
                }
              });

              this.uploadProgress[fieldKey] = 100;
              this.selectedFiles[fieldKey] = null;
            }
          },
          error: (err: HttpErrorResponse) => {
            this.uploadError[fieldKey] = err.error?.message || 'Upload failed.';
          }
        });
    } catch (err: any) {
      this.isUploading[fieldKey] = false;
      this.uploadError[fieldKey] = err?.message || 'Upload failed.';
    }
  }

  getLabel(fieldKey: MediaKey): string {
    return this.mediaFields.find(f => f.key === fieldKey)?.label || fieldKey;
  }

  getFieldType(fieldKey: MediaKey): 'image' | 'video' {
    return this.mediaFields.find(f => f.key === fieldKey)?.type || 'image';
  }

  openMedia(url: string): void {
    window.open(url, '_blank');
  }

  // ---------- BACK + BATCH HISTORY LOG ----------

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
      ).then(() => {
        this.navigateBack();
      }).catch(() => {
        this.navigateBack();
      });
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
    return this.authz.hasAnyPermission([
      'CanCreateInspection',
      'CanEditInspection'
    ]);
  }
}

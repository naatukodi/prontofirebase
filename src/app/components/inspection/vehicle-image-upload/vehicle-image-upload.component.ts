// src/app/vehicle-image-upload/vehicle-image-upload.component.ts

import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';
import {
  ActivatedRoute,
  Router
} from '@angular/router';
import {
  HttpEvent,
  HttpEventType,
  HttpErrorResponse
} from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { VehicleInspectionService } from '../../../services/vehicle-inspection.service';
import { WorkflowButtonsComponent } from '../../workflow-buttons/workflow-buttons.component';
import { SharedModule } from '../../shared/shared.module/shared.module';
import { AuthorizationService } from '../../../services/authorization.service';
import { RouterModule } from '@angular/router';

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

interface ImageField {
  key: ImageKey;
  label: string;
  optional: boolean;
}

@Component({
  selector: 'app-vehicle-image-upload',
  imports: [SharedModule, WorkflowButtonsComponent, RouterModule],
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

  imageFields: ImageField[] = [
    { key: 'frontLeftSide',       label: 'Front Left Side',           optional: false },
    { key: 'frontRightSide',      label: 'Front Right Side',          optional: false },
    { key: 'rearLeftSide',        label: 'Rear Left Side',            optional: false },
    { key: 'rearRightSide',       label: 'Rear Right Side',           optional: false },
    { key: 'frontViewGrille',     label: 'Front View (grille)',       optional: false },
    { key: 'rearViewTailgate',    label: 'Rear View (tailgate)',      optional: false },
    { key: 'driverSideProfile',   label: 'Driver’s Side Profile',     optional: false },
    { key: 'passengerSideProfile',label: 'Passenger Side Profile',    optional: false },
    { key: 'dashboard',           label: 'Dashboard',                 optional: false },
    { key: 'instrumentCluster',   label: 'Instrument Cluster / Odometer', optional: false },
    { key: 'engineBay',           label: 'Engine Bay',                optional: false },
    { key: 'chassisNumberPlate',  label: 'Chassis Number Plate',      optional: false },
    { key: 'chassisImprint',      label: 'Chassis Imprint (scratched on metal)', optional: false },
    { key: 'gearAndSeats',        label: 'Gear and Seats (interior)', optional: false },
    { key: 'dashboardCloseup',    label: 'Dashboard Close-up (controls)', optional: false },
    { key: 'odometer',            label: 'Odometer',                  optional: false },
    { key: 'selfieWithVehicle',   label: 'Selfie of Inspector with Vehicle', optional: false },
    { key: 'underbody',           label: 'Underbody',                 optional: true  },
    { key: 'tiresAndRims',        label: 'Tires and Rims',            optional: false }
  ];

  // Holds the File object once a user selects one
  selectedFiles: Record<ImageKey, File | null> = {
    frontLeftSide:      null,
    frontRightSide:     null,
    rearLeftSide:       null,
    rearRightSide:      null,
    frontViewGrille:    null,
    rearViewTailgate:   null,
    driverSideProfile:  null,
    passengerSideProfile:null,
    dashboard:          null,
    instrumentCluster:  null,
    engineBay:          null,
    chassisNumberPlate: null,
    chassisImprint:     null,
    gearAndSeats:       null,
    dashboardCloseup:   null,
    odometer:           null,
    selfieWithVehicle:  null,
    underbody:          null,
    tiresAndRims:       null,
  };

  // Holds the current (possibly timestamp‐busted) URLs for all keys
  uploadedUrls: Record<ImageKey, string | null> = {
    frontLeftSide:      null,
    frontRightSide:     null,
    rearLeftSide:       null,
    rearRightSide:      null,
    frontViewGrille:    null,
    rearViewTailgate:   null,
    driverSideProfile:  null,
    passengerSideProfile:null,
    dashboard:          null,
    instrumentCluster:  null,
    engineBay:          null,
    chassisNumberPlate: null,
    chassisImprint:     null,
    gearAndSeats:       null,
    dashboardCloseup:   null,
    odometer:           null,
    selfieWithVehicle:  null,
    underbody:          null,
    tiresAndRims:       null,
  };

  uploadProgress: Partial<Record<ImageKey, number>> = {};
  isUploading:    Partial<Record<ImageKey, boolean>> = {};
  uploadError:    Partial<Record<ImageKey, string>> = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vehicleInspectionService: VehicleInspectionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.valuationType = this.route.snapshot.paramMap.get('valuationType')!;
    // 1) Grab route param “valuationId”
    this.valuationId = this.route.snapshot.paramMap.get('valuationId') || '';
    if (!this.valuationId) {
      this.error = 'Missing valuationId in route.';
      return;
    }

    // 2) Grab query params vehicleNumber + applicantContact, then load existing images
    this.route.queryParamMap.subscribe(params => {
      const vn = params.get('vehicleNumber');
      const ac = params.get('applicantContact');
      if (vn && ac) {
        this.vehicleNumber = vn;
        this.applicantContact = ac;
        this.loadExistingImages();
      } else {
        this.error = 'Missing vehicleNumber or applicantContact in query parameters.';
      }
    });
  }

  private loadExistingImages(): void {
    this.vehicleInspectionService
      .getVehicleImages(this.valuationId, this.vehicleNumber, this.applicantContact)
      .subscribe({
        next: (map: Record<string,string>) => {
          // Normalize keys (“FrontLeftSide” → “frontLeftSide”) and assign
          Object.keys(map).forEach((key) => {
            const normalizedKey = key.charAt(0).toLowerCase() + key.slice(1);
            if ((this.uploadedUrls as any)[normalizedKey] !== undefined) {
              (this.uploadedUrls as any)[normalizedKey] = map[key];
            }
          });
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.warn('No existing images or error fetching them', err);
        }
      });
  }

  onFileSelected(
    event: Event,
    fieldKey: ImageKey
  ) {
    const inputEl = event.target as HTMLInputElement;
    if (!inputEl.files || inputEl.files.length === 0) {
      this.selectedFiles[fieldKey] = null;
      return;
    }
    this.selectedFiles[fieldKey] = inputEl.files[0];
    this.uploadError[fieldKey] = undefined;
  }

  private buildSingleFormData(fieldKey: ImageKey): FormData {
    const formData = new FormData();
    const file = this.selectedFiles[fieldKey]!;
    formData.append(fieldKey, file, file.name);
    formData.append('ValuationId', this.valuationId);
    formData.append('VehicleNumber', this.vehicleNumber);
    formData.append('ApplicantContact', this.applicantContact);
    return formData;
  }

  async uploadImage(fieldKey: ImageKey) {
    const isOptional = this.imageFields.find(f => f.key === fieldKey)!.optional;

    // 1) If no file chosen & not optional → show error
    if (!this.selectedFiles[fieldKey] && !isOptional) {
      this.uploadError[fieldKey] = `Please select "${this.getLabel(fieldKey)}" image.`;
      return;
    }
    // 2) If no new file but URL already exists → do nothing
    if (!this.selectedFiles[fieldKey] && this.uploadedUrls[fieldKey]) {
      return;
    }

    // Reset progress & state for this key
    this.uploadProgress[fieldKey] = 0;
    this.isUploading[fieldKey] = true;
    this.uploadError[fieldKey] = undefined;

    const payload = this.buildSingleFormData(fieldKey);

    try {
      // Call the PUT /photos endpoint, expecting a full Record<string,string> response
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
          // a) Show progress bar if we get UploadProgress
          if (event.type === HttpEventType.UploadProgress && event.total) {
            this.uploadProgress[fieldKey] = Math.round((100 * event.loaded) / event.total);
          }
          // b) On final response, event.body is the full map of all URLs
          else if (event.type === HttpEventType.Response) {
            const bodyMap = event.body as Record<string,string>;
            console.log('Full upload response map:', bodyMap);

            // 1) Normalize and merge each returned URL into uploadedUrls
            Object.keys(bodyMap).forEach((returnedKey) => {
              const normalizedKey = returnedKey.charAt(0).toLowerCase() + returnedKey.slice(1);
              if ((this.uploadedUrls as any)[normalizedKey] !== undefined) {
                // Cache‐bust by appending timestamp
                const rawUrl = bodyMap[returnedKey];
                const busted = `${rawUrl}?t=${new Date().getTime()}`;

                // 1a) Clear out old URL first
                (this.uploadedUrls as any)[normalizedKey] = null;
                this.cdr.detectChanges();

                // 1b) Wait one tick, then assign the busted URL
                setTimeout(() => {
                  (this.uploadedUrls as any)[normalizedKey] = busted;
                  this.cdr.detectChanges();
                }, 0);
              }
            });

            // 2) Reset file selection and progress for this field
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

  getLabel(fieldKey: ImageKey): string {
    return this.imageFields.find(f => f.key === fieldKey)!.label;
  }

  openImage(url: string): void {
    window.open(url, '_blank');
  }

  onBack(): void {
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

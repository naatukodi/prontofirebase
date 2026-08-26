// src/app/vehicle-image-upload/vehicle-image-upload.component.ts

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpEvent, HttpEventType, HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { VehicleInspectionService, PhotoMetadata, SavedCustomPhoto } from '../../../services/vehicle-inspection.service';
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
  | 'vinPlate' | 'chassisImprint'
  | 'gearInterior' | 'frontSeat' | 'rearSeat'
  | 'dashboardCloseup' | 'odometer' | 'selfieWithVehicle'
  | 'underbody'
  | 'tireFrontLeft' | 'tireFrontRight' | 'tireRearLeft' | 'tireRearRight'
  | 'chassisVerification' | 'chassisStencilTrace' | 'workingOperationPhoto';

type MediaKey = ImageKey | 'vehicleVideo';

interface MediaField {
  key: MediaKey;
  label: string;
  type: 'image' | 'video';
  optional: boolean;
}

interface PhotoGroup {
  title: string;
  hint: string;
  fields: MediaField[];
  /** Slots in this group that already have a file on the server. */
  uploaded: number;
  /** Slots with a file chosen locally but not yet sent. */
  pending: MediaKey[];
  /** True while any slot in the group is mid-upload. */
  busy: boolean;
}

@Component({
  selector: 'app-vehicle-image-upload',
  imports: [SharedModule, WorkflowButtonsComponent, RouterModule, FormsModule],
  standalone: true,
  templateUrl: './vehicle-image-upload.component.html',
  styleUrls: ['./vehicle-image-upload.component.scss']
})
export class VehicleImageUploadComponent implements OnInit, OnDestroy {
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
    { key: 'dashboard',              label: 'Dashboard',                           type: 'image', optional: true  },
    { key: 'instrumentCluster',      label: 'Instrument Cluster / Odometer',       type: 'image', optional: true  },
    { key: 'engineBay',              label: 'Engine Bay',                          type: 'image', optional: false },
    { key: 'vinPlate',               label: 'VIN Plate',                           type: 'image', optional: false },
    { key: 'chassisImprint',         label: 'Chassis Imprint (scratched on metal)',type: 'image', optional: false },
    { key: 'gearInterior',           label: 'Gear (Interior)',                     type: 'image', optional: true  },
    { key: 'frontSeat',              label: 'Front Seat',                          type: 'image', optional: true  },
    { key: 'rearSeat',               label: 'Rear Seat',                           type: 'image', optional: true  },
    { key: 'dashboardCloseup',       label: 'Dashboard Close-up (controls)',       type: 'image', optional: true  },
    { key: 'odometer',               label: 'Odometer',                            type: 'image', optional: false },
    { key: 'selfieWithVehicle',      label: 'Selfie of Inspector with Vehicle',    type: 'image', optional: false },
    { key: 'underbody',              label: 'Underbody',                           type: 'image', optional: true  },
    { key: 'tireFrontLeft',          label: 'Tire - Front Left',                   type: 'image', optional: true  },
    { key: 'tireFrontRight',         label: 'Tire - Front Right',                  type: 'image', optional: true  },
    { key: 'tireRearLeft',           label: 'Tire - Rear Left',                    type: 'image', optional: true  },
    { key: 'tireRearRight',          label: 'Tire - Rear Right',                   type: 'image', optional: true  },
    { key: 'vehicleVideo',           label: 'Vehicle Video',                       type: 'video', optional: false },
    { key: 'chassisVerification',    label: 'Chassis Verification',                type: 'image', optional: false },
    { key: 'chassisStencilTrace',    label: 'Chassis Stencil Trace',               type: 'image', optional: false },
    { key: 'workingOperationPhoto',  label: 'Working / Operation Photo',           type: 'image', optional: false }
  ];

  selectedFiles: Record<MediaKey, File | null> = this.initRecord(null);
  uploadedUrls: Record<MediaKey, string | null> = this.initRecord(null);

  /**
   * Object URLs for files picked but not yet uploaded, so the card shows the chosen
   * photo immediately instead of staying blank until the server round-trip finishes.
   * Revoked when replaced or on destroy — object URLs leak until released.
   */
  localPreviews: Record<MediaKey, string | null> = this.initRecord(null);
  uploadProgress: Partial<Record<MediaKey, number>> = {};
  isUploading:    Partial<Record<MediaKey, boolean>> = {};
  uploadError:    Partial<Record<MediaKey, string>> = {};

  /**
   * Mandatory slots block Save on the AVO page; optional ones never do. Grouping
   * them makes that split visible instead of tagging individual cards in one
   * undifferentiated grid.
   */
  get photoGroups(): PhotoGroup[] {
    const build = (title: string, hint: string, fields: MediaField[]): PhotoGroup => ({
      title,
      hint,
      fields,
      uploaded: fields.filter(f => !!this.uploadedUrls[f.key]).length,
      // Files browsed for but not sent yet — what the group's Upload button will send.
      pending: fields.filter(f => !!this.selectedFiles[f.key]).map(f => f.key),
      busy: fields.some(f => this.isUploading[f.key])
    });

    return [
      build('Mandatory Photos',
            'All of these are required before the inspection can be saved.',
            this.mediaFields.filter(f => !f.optional)),
      build('Optional Photos',
            'Upload these when they apply — they never block saving.',
            this.mediaFields.filter(f => f.optional))
    ];
  }

  /**
   * photoGroups is a getter that returns freshly built objects on every call, so with
   * *ngFor's default identity tracking Angular treated them as new items on EVERY
   * change detection pass and destroyed/recreated both group subtrees — including
   * every <input type="file">. The picker would open on one input element, that
   * element was replaced moments later, and the file chosen in the dialog landed on
   * a detached input: the selection silently disappeared every time.
   *
   * Tracking by a stable key keeps the inputs alive across re-renders.
   */
  trackGroup = (_: number, g: PhotoGroup): string => g.title;
  trackField = (_: number, f: MediaField): MediaKey => f.key;

  /** A required slot with nothing uploaded yet — outlined in red on the card. */
  isMissingMandatory(field: MediaField): boolean {
    return !field.optional && !this.uploadedUrls[field.key];
  }

  /** Total required slots still empty, across both groups. */
  get missingMandatoryCount(): number {
    return this.mediaFields.filter(f => this.isMissingMandatory(f)).length;
  }

  /** Uploads every file selected in this group, one at a time. */
  async uploadGroup(group: PhotoGroup): Promise<void> {
    for (const key of group.pending) {
      await this.uploadMedia(key);
    }
    this.cdr.detectChanges();
  }

  // ── Additional (custom-named) photos ──
  customPhotoEntries: { file: File | null; name: string }[] = [];
  savedCustomPhotos: SavedCustomPhoto[] = [];
  customUploading = false;
  customUploadError: string | undefined;

  // ── Photo annotation (burn a note onto an already-uploaded photo) ──
  annotating: { photoKey: string; url: string; label: string } | null = null;
  annotationNote = '';
  annotationSaving = false;
  annotationError: string | undefined;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vehicleInspectionService: VehicleInspectionService,
    private cdr: ChangeDetectorRef,
    private auth: Auth,
    private historyLogger: HistoryLoggerService
  ) {
    this.mediaFields.forEach(f => {
        this.mediaMetadata[f.key] = {};
    });
  }

  private initRecord(val: any): any {
    const rec: any = {};
    this.mediaFields.forEach(f => rec[f.key] = val);
    return rec;
  }

  ngOnDestroy(): void {
    // Object URLs are held by the browser until revoked; leaving the page with
    // unuploaded picks would leak them.
    (Object.keys(this.localPreviews) as MediaKey[]).forEach(k => this.clearLocalPreview(k));
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
        this.loadSavedCustomPhotos();
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

  // Loads existing annotation notes so the pencil modal can pre-fill them.
  // (Date/location metadata is burned into the photo by the camera app,
  // so it's no longer collected or displayed here.)
  private loadExistingMetadata(): void {
    this.vehicleInspectionService.getPhotoMetadata(this.valuationId, this.vehicleNumber, this.applicantContact).subscribe({
        next: (data) => {
            if(data) {
                Object.keys(data).forEach(key => {
                    const normalizedKey = key.charAt(0).toLowerCase() + key.slice(1);
                    if(this.mediaMetadata[normalizedKey]) {
                        this.mediaMetadata[normalizedKey] = {
                            annotationNote: data[key].annotationNote
                        };
                    }
                });
            }
        },
        error: (err) => console.warn('Failed to load metadata', err)
    });
  }

  onFileSelected(event: Event, fieldKey: MediaKey) {
    const inputEl = event.target as HTMLInputElement;

    // Release any previous pick for this slot before replacing it.
    this.clearLocalPreview(fieldKey);

    if (!inputEl.files || inputEl.files.length === 0) {
      this.selectedFiles[fieldKey] = null;
      this.cdr.detectChanges();
      return;
    }

    const file = inputEl.files[0];
    this.selectedFiles[fieldKey] = file;
    this.localPreviews[fieldKey] = URL.createObjectURL(file);
    this.uploadError[fieldKey] = undefined;

    // The app runs zoneless (provideZonelessChangeDetection), so mutating these
    // fields does not re-render on its own — without this the card stays blank and
    // the picked photo appears to have been ignored.
    this.cdr.detectChanges();
  }

  private clearLocalPreview(fieldKey: MediaKey) {
    const url = this.localPreviews[fieldKey];
    if (url) {
      URL.revokeObjectURL(url);
      this.localPreviews[fieldKey] = null;
    }
  }

  private buildSingleFormData(fieldKey: MediaKey): FormData {
    const formData = new FormData();
    const file = this.selectedFiles[fieldKey]!;
    formData.append(fieldKey, file, file.name);
    return formData;
  }

  // ✅ UPLOAD MEDIA (With Loop Fix)
  // Resolves once the request has finished (success or failure) so uploadGroup can
  // await each slot in turn rather than firing them all at once.
  async uploadMedia(fieldKey: MediaKey): Promise<void> {
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

      await new Promise<void>(resolve => {
      observable.pipe(
        finalize(() => {
          this.isUploading[fieldKey] = false;
          resolve();
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

            this.uploadProgress[fieldKey] = 100;
            this.selectedFiles[fieldKey] = null;
            // The server URL now drives the card; drop the local object URL.
            this.clearLocalPreview(fieldKey);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.uploadError[fieldKey] = err.error?.message || 'Upload failed.';
        }
      });
      });
    }
    catch (err: any) {
      this.isUploading[fieldKey] = false;
      this.uploadError[fieldKey] = err?.message || 'Upload failed.';
    }
  }

  // ── Additional (custom-named) photos ──

  private loadSavedCustomPhotos(): void {
    this.vehicleInspectionService
      .getCustomPhotos(this.valuationId, this.vehicleNumber, this.applicantContact)
      .subscribe({
        next: (photos) => { this.savedCustomPhotos = photos || []; this.cdr.detectChanges(); },
        error: (err) => console.warn('Failed to load custom photos', err)
      });
  }

  addCustomPhotoRow(): void {
    this.customPhotoEntries.push({ file: null, name: '' });
  }

  removeCustomPhotoRow(index: number): void {
    this.customPhotoEntries.splice(index, 1);
  }

  onCustomFileSelected(event: Event, index: number): void {
    const inputEl = event.target as HTMLInputElement;
    if (inputEl.files && inputEl.files.length > 0) {
      this.customPhotoEntries[index].file = inputEl.files[0];
    }
    // Same zoneless caveat as onFileSelected — without this the chosen file name
    // never appears and the row looks like nothing was picked.
    this.cdr.detectChanges();
  }

  private getCurrentLocationText(): Promise<string | undefined> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(undefined); return; }
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await response.json();
            const address = data.address;
            const parts = [
              address.suburb || address.neighbourhood || address.road,
              address.city || address.town || address.village,
              address.state
            ].filter(Boolean);
            resolve(parts.length > 0 ? parts.join(', ') : `${lat.toFixed(5)}, ${lon.toFixed(5)}`);
          } catch {
            resolve(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
          }
        },
        () => resolve(undefined),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  async uploadCustomPhotos(): Promise<void> {
    const validEntries = this.customPhotoEntries.filter(e => e.file && e.name.trim());
    if (validEntries.length === 0) {
      this.customUploadError = 'Add at least one photo with a name before uploading.';
      return;
    }

    this.customUploading = true;
    this.customUploadError = undefined;

    const now = new Date().toISOString();
    const locationText = await this.getCurrentLocationText();

    const formData = new FormData();
    const metadata = validEntries.map((entry, i) => {
      formData.append('CustomImageFiles', entry.file!, entry.file!.name);
      return { Index: i, Name: entry.name.trim(), Date: now, Location: locationText };
    });
    formData.append('CustomImagesMetadata', JSON.stringify(metadata));

    try {
      const observable = await this.vehicleInspectionService.uploadPhotos(
        this.valuationId,
        this.vehicleNumber,
        this.applicantContact,
        formData,
        { observe: 'events' }
      );

      observable.pipe(finalize(() => { this.customUploading = false; })).subscribe({
        next: (event: HttpEvent<any>) => {
          if (event.type === HttpEventType.Response) {
            this.customPhotoEntries = [];
            this.loadSavedCustomPhotos();
          }
        },
        error: (err: HttpErrorResponse) => {
          this.customUploadError = err.error?.message || 'Upload failed.';
        }
      });
    } catch (err: any) {
      this.customUploading = false;
      this.customUploadError = err?.message || 'Upload failed.';
    }
  }

  // ── Photo annotation ──

  openAnnotateFixed(field: MediaField): void {
    const url = this.uploadedUrls[field.key];
    if (!url) return;
    const photoKey = field.key.charAt(0).toUpperCase() + field.key.slice(1);
    this.annotating = { photoKey, url, label: field.label };
    this.annotationNote = this.mediaMetadata[field.key]?.annotationNote || '';
    this.annotationError = undefined;
  }

  openAnnotateCustom(photo: SavedCustomPhoto): void {
    this.annotating = { photoKey: photo.id, url: photo.photoUrl, label: photo.name };
    this.annotationNote = photo.annotationNote || '';
    this.annotationError = undefined;
  }

  closeAnnotate(): void {
    if (this.annotationSaving) return;
    this.annotating = null;
  }

  saveAnnotation(): void {
    if (!this.annotating) return;

    this.annotationSaving = true;
    this.annotationError = undefined;
    const { photoKey } = this.annotating;

    this.vehicleInspectionService
      .annotatePhoto(this.valuationId, this.vehicleNumber, this.applicantContact, photoKey, this.annotationNote.trim())
      .subscribe({
        next: ({ photoUrl, note }) => {
          const busted = `${photoUrl}?t=${new Date().getTime()}`;

          const field = this.mediaFields.find(f => f.key.charAt(0).toUpperCase() + f.key.slice(1) === photoKey);
          if (field) {
            (this.uploadedUrls as any)[field.key] = busted;
            if (this.mediaMetadata[field.key]) this.mediaMetadata[field.key].annotationNote = note;
          } else {
            const customPhoto = this.savedCustomPhotos.find(p => p.id === photoKey);
            if (customPhoto) {
              customPhoto.photoUrl = busted;
              customPhoto.annotationNote = note;
            }
          }

          this.annotationSaving = false;
          this.annotating = null;
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.annotationSaving = false;
          this.annotationError = err.error?.message || 'Failed to save annotation.';
        }
      });
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
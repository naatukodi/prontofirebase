// src/app/services/media-upload.service.ts
//
// Photos and video uploaded from the camera app, so the office learns they have
// arrived without opening every case: the header bell, a pop-up when a new upload
// lands, and a badge on the case's dashboard row.

import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription, of, timer } from 'rxjs';
import { catchError, filter, switchMap } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { AuthorizationService } from './authorization.service';

export interface MediaUpload {
  id: string;
  valuationId: string;
  vehicleNumber: string;
  applicantContact: string;
  referenceNumber?: string | null;
  valuationType?: string | null;
  /** "CameraApp", or "MobileApp" for a phone that did not say which app it was. */
  source: string;
  uploadedBy?: string | null;
  photos: string[];
  customPhotoCount: number;
  videoIncluded: boolean;
  mediaOptional: boolean;
  missingMandatory: string[];
  firstUploadedAt: string;
  lastUploadedAt: string;
}

/**
 * Job roles that hear about uploads: the AVO and every stage after it, and every
 * kind of admin — the people who work the AVO page.
 */
export const UPLOAD_MESSAGE_ROLES = ['AVO', 'QC', 'FinalReport', 'Admin', 'StateAdmin', 'SuperAdmin'];

/** How often the portal asks for new uploads while it is open and visible. */
const POLL_MS = 60_000;

/** A dashboard row shows its case's upload for this long. */
const BADGE_MS = 24 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class MediaUploadService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private authz = inject(AuthorizationService);

  /** Uploads from the last week, latest first. Empty for roles that don't hear about them. */
  readonly uploads = signal<MediaUpload[]>([]);

  /** When this user last marked the list read (epoch ms). */
  private readonly seenAt = signal(0);

  readonly unreadCount = computed(() =>
    this.uploads().filter(u => this.isUnread(u)).length);

  /** Each case's latest upload from the last day, for the dashboard badge. */
  readonly recentByCase = computed(() => {
    const cutoff = Date.now() - BADGE_MS;
    const byCase = new Map<string, MediaUpload>();
    for (const u of this.uploads()) {
      if (new Date(u.lastUploadedAt).getTime() < cutoff) continue;
      if (!byCase.has(u.valuationId)) byCase.set(u.valuationId, u);
    }
    return byCase;
  });

  private poll?: Subscription;
  private userId = '';
  /** lastUploadedAt per upload at the previous poll, to tell what is new since. */
  private known: Map<string, string> | null = null;

  /** Starts polling for this user. Safe to call again for the same user. */
  start(userId: string): void {
    if (this.poll && this.userId === userId) return;
    this.stop();
    this.userId = userId;
    this.seenAt.set(this.readSeenAt());

    this.poll = timer(0, POLL_MS).pipe(
      // A hidden tab skips its turn; the next one after it is shown catches up.
      filter(() => document.visibilityState !== 'hidden'),
      switchMap(() => this.http
        .get<MediaUpload[]>(`${environment.apiBaseUrl}media-uploads?days=7`)
        .pipe(catchError(() => of(null))))
    ).subscribe(rows => {
      if (!rows) return;
      this.announceNew(rows);
      this.uploads.set(rows);
    });
  }

  stop(): void {
    this.poll?.unsubscribe();
    this.poll = undefined;
    this.known = null;
    this.uploads.set([]);
  }

  isUnread(u: MediaUpload): boolean {
    return new Date(u.lastUploadedAt).getTime() > this.seenAt();
  }

  markAllRead(): void {
    const now = Date.now();
    this.seenAt.set(now);
    try { localStorage.setItem(this.storageKey(), String(now)); } catch { /* private mode */ }
  }

  /** "18 photos + video", "3 photos", "video only". */
  summary(u: MediaUpload): string {
    const photos = u.photos.length + u.customPhotoCount;
    const parts: string[] = [];
    if (photos) parts.push(`${photos} photo${photos === 1 ? '' : 's'}`);
    if (u.videoIncluded) parts.push(photos ? 'video' : 'video only');
    return parts.join(' + ') || 'media';
  }

  sourceLabel(u: MediaUpload): string {
    return u.source === 'CameraApp' ? 'camera app' : 'mobile app';
  }

  /** Opens the case's AVO page, where the uploaded photos are. */
  open(u: MediaUpload): void {
    if (!this.authz.hasPermission('CanViewInspection')) {
      this.snackBar.open(`You don't have access to the AVO page for ${u.vehicleNumber}.`, 'Close', { duration: 5000 });
      return;
    }
    this.router.navigate(['/valuation', u.valuationId, 'inspection'], {
      queryParams: {
        vehicleNumber: u.vehicleNumber,
        applicantContact: u.applicantContact,
        valuationType: u.valuationType || undefined
      }
    });
  }

  /**
   * Pops up uploads that are new or grew (the video lands after the photos) since
   * the previous poll. The first poll after opening the portal only takes stock:
   * the bell's unread count covers what arrived while it was closed.
   */
  private announceNew(rows: MediaUpload[]): void {
    const previous = this.known;
    this.known = new Map(rows.map(u => [u.id, u.lastUploadedAt]));
    if (!previous) return;

    const fresh = rows.filter(u => previous.get(u.id) !== u.lastUploadedAt);
    if (fresh.length === 0) return;

    const latest = fresh[0];
    const text = fresh.length === 1
      ? `📷 Photos uploaded: ${latest.vehicleNumber} — ${this.summary(latest)}`
      : `📷 ${fresh.length} new uploads, latest ${latest.vehicleNumber} — ${this.summary(latest)}`;
    this.snackBar.open(text, 'OPEN', {
      duration: 10000,
      horizontalPosition: 'end',
      verticalPosition: 'bottom'
    }).onAction().subscribe(() => this.open(latest));
  }

  private storageKey(): string {
    return `vehga_uploads_seen_${this.userId}`;
  }

  /** Never marked read: count the last day's uploads as new, not the whole week's. */
  private readSeenAt(): number {
    try {
      const stored = Number(localStorage.getItem(this.storageKey()));
      if (stored > 0) return stored;
    } catch { /* private mode */ }
    return Date.now() - BADGE_MS;
  }
}

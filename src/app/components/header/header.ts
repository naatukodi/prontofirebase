import { Component, HostListener, ViewChild, inject } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { BreakpointObserver } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../shared/shared.module/shared.module';

import { Auth, authState, User } from '@angular/fire/auth';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap, shareReplay, tap } from 'rxjs/operators';

import { AuthService } from '../../services/auth.service';
import { AuthorizationService } from '../../services/authorization.service';
import { UsersService } from '../../services/users.service';
import { BrandService } from '../../services/brand.service';
import { MediaUpload, MediaUploadService, UPLOAD_MESSAGE_ROLES } from '../../services/media-upload.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SharedModule
  ],
  templateUrl: './header.html',
  styleUrls: ['./header.css']
})
export class HeaderComponent {
  @ViewChild('drawer') drawer!: MatSidenav;

  private bp = inject(BreakpointObserver);
  private auth = inject(Auth);
  private usersSvc = inject(UsersService);

  authSvc = inject(AuthService);
  authzSvc1 = inject(AuthorizationService);
  /** Public: the template binds the logo to brand.profile(). */
  brand = inject(BrandService);

  isHandset$: Observable<boolean> = this.bp
    .observe(['(max-width: 768px)'])
    .pipe(map(r => r.matches));

  /** Firebase auth user */
  user$: Observable<User | null> = authState(this.auth);

  /** Display name from API or Firebase fallback */
  userName$: Observable<string> = this.user$.pipe(
    switchMap(u => {
      if (!u) return of('');
      const id = this.resolveId(u);
      if (!id) return of(this.fallbackName(u));
      return this.usersSvc.getById(id).pipe(
        map(m => (m?.name?.trim() || this.fallbackName(u)))
      );
    }),
    shareReplay(1)
  );

  /** Roles from backend */
  roles$: Observable<string[]> = this.user$.pipe(
    switchMap(u => {
      if (!u) return of<string[]>([]);
      const phone = u.phoneNumber ?? '';
      return phone ? this.usersSvc.getRoles(phone) : of<string[]>([]);
    }),
    shareReplay(1)
  );

  /** Derived flags */
  isAdmin$: Observable<boolean> = this.roles$.pipe(
    map(roles => roles.includes('Admin')),
    shareReplay(1)
  );

  canEditStakeholder$: Observable<boolean> = this.roles$.pipe(
    map(roles => roles.includes('CanEditStakeholder')),
    shareReplay(1)
  );

  // ── Photo uploads from the camera app ────────────────────────────────────
  uploads = inject(MediaUploadService);
  uploadsOpen = false;
  /** Uploads whose photo names are showing. */
  expanded = new Set<string>();

  /**
   * Whether this user's job role hears about uploads (UPLOAD_MESSAGE_ROLES), and
   * starts or stops the polling to match.
   */
  showUploads$: Observable<boolean> = this.user$.pipe(
    switchMap(u => {
      const id = u ? this.resolveId(u) : null;
      if (!id) return of({ id: '', show: false });
      return this.usersSvc.getById(id).pipe(
        map(m => ({ id, show: UPLOAD_MESSAGE_ROLES.includes(m?.roleId ?? '') })),
        catchError(() => of({ id, show: false }))
      );
    }),
    tap(({ id, show }) => show ? this.uploads.start(id) : this.uploads.stop()),
    map(r => r.show),
    shareReplay(1)
  );

  toggleUploads(event: Event): void {
    event.stopPropagation();
    this.uploadsOpen = !this.uploadsOpen;
  }

  /** A click anywhere outside the panel closes it. */
  @HostListener('document:click')
  closeUploads(): void {
    this.uploadsOpen = false;
  }

  openUpload(u: MediaUpload): void {
    this.uploadsOpen = false;
    this.uploads.open(u);
  }

  toggleDetails(u: MediaUpload): void {
    if (!this.expanded.delete(u.id)) this.expanded.add(u.id);
  }

  /** Time alone for today's uploads, the date as well for older ones. */
  timeFormat(u: MediaUpload): string {
    return new Date(u.lastUploadedAt).toDateString() === new Date().toDateString()
      ? 'h:mm a'
      : 'd MMM, h:mm a';
  }

  missingText(u: MediaUpload): string {
    const shown = u.missingMandatory.slice(0, 3).join(', ');
    const more = u.missingMandatory.length - 3;
    return more > 0 ? `${shown} +${more} more` : shown;
  }

  photoList(u: MediaUpload): string {
    const names = [...u.photos];
    if (u.customPhotoCount) names.push(`${u.customPhotoCount} additional photo${u.customPhotoCount === 1 ? '' : 's'}`);
    if (u.videoIncluded) names.push('Vehicle Video');
    return names.join(', ');
  }

  onLogout(): void {
    this.uploads.stop();
    this.authSvc.logout();
    this.authzSvc1.clearPermissions();
  }

  /** Prefer phoneNumber, then uid, then email */
  private resolveId(u: User): string | null {
    return u.phoneNumber ?? u.uid ?? u.email ?? null;
  }

  private fallbackName(u: User): string {
    return u.displayName || u.email || u.phoneNumber || '';
  }
}

// src/app/login/login.component.ts
import { Component, OnInit, inject, NgZone } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  linkWithCredential,
  updatePassword,
  EmailAuthProvider,
  RecaptchaVerifier,
  ConfirmationResult,
  User
} from 'firebase/auth';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AuthorizationService } from '../services/authorization.service';
import { BrandService, BRANDS, BrandKey } from '../services/brand.service';

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

/**
 * Phone + password login without SMS.
 *
 * Firebase has no phone+password sign-in, so the password is stored on the same Firebase
 * account under a hidden email made from the phone number (+919876543210 becomes
 * 919876543210@login.vehga.in). Nobody sees that address and no mail is ever sent to it.
 * Because the password is linked to the existing phone account, the account keeps its uid
 * and phoneNumber, and everything that identifies staff by phone keeps working.
 *
 * OTP stays as the way to set a password the first time and to reset a forgotten one.
 */
const PASSWORD_LOGIN_DOMAIN = 'login.vehga.in';
const MIN_PASSWORD_LENGTH = 8;

type LoginMode = 'password' | 'otp' | 'setPassword';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,  // brings in template-driven forms
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit {
  /* DI-managed Auth: ensures the Firebase app is initialized even when
     /login is the first page loaded (raw getAuth() crashed here) */
  private auth = inject(Auth);
  private authSvc = inject(AuthService);
  private authz = inject(AuthorizationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private zone = inject(NgZone);

  /** Public so the template can read isPinned / active(). */
  brand = inject(BrandService);
  brands = Object.values(BRANDS);

  /** Picking a company repaints the login screen in that brand immediately, so it is
   *  obvious which one you are signing into before the OTP is sent. */
  chooseBrand(key: BrandKey) {
    this.brand.select(key);
  }

  mode: LoginMode = 'password';
  busy = false;
  error = '';

  phone = '+91';
  password = '';
  year = new Date().getFullYear();

  /** Set-password step, shown after an OTP login. */
  newPassword = '';
  confirmPassword = '';
  /** True when the account already has a password, so this step changes it. */
  hasPassword = false;
  /** The signed-in number, given to the browser's password manager as the username. */
  accountPhone = '';
  readonly minPasswordLength = MIN_PASSWORD_LENGTH;

  // Ensure phone is always 13 characters including '+91'
  setPhone(value: string) {
    // Remove any non-digit characters except '+'
    let cleaned = value.replace(/[^\d+]/g, '');

    // Ensure it starts with '+91'
    if (!cleaned.startsWith('+91')) {
      cleaned = '+91' + cleaned.replace(/^\+?91?/, '');
    }

    // Limit to 13 characters
    this.phone = cleaned.slice(0, 13);
  }

  get formattedPhone(): string {
    // If phone starts with '+', return as is; else prepend '+91'
    return this.phone.startsWith('+') ? this.phone : `+91${this.phone}`;
  }
  otp = '';
  confirmation?: ConfirmationResult;
  private recaptchaVerifier!: RecaptchaVerifier;

  ngOnInit() {
    this.authSvc.returnUrl =
      this.route.snapshot.queryParamMap.get('returnUrl') || '/';

    this.recaptchaVerifier = new RecaptchaVerifier(
      this.auth,
      'recaptcha-container',
      { size: 'invisible' }
    );
    this.recaptchaVerifier.render().catch(() => {});
  }

  /** Enter key / primary button: do the next step for the current view. */
  onSubmit() {
    if (this.busy) return;
    if (this.mode === 'password') this.signInWithPassword();
    else if (this.mode === 'setPassword') this.savePassword();
    else if (this.confirmation) this.verifyOTP();
    else this.sendOTP();
  }

  /** Switch between password and OTP login, keeping the phone number typed so far. */
  useMode(mode: 'password' | 'otp') {
    this.mode = mode;
    this.error = '';
    this.otp = '';
    this.confirmation = undefined;
  }

  private phoneIsValid(): boolean {
    if (this.phone.match(/^\+\d{10,15}$/)) return true;
    this.error = 'Enter your phone number with the country code, for example +911234567890.';
    return false;
  }

  /** The hidden login address for a phone number: digits only, at the login domain. */
  private passwordLoginEmail(phone: string): string {
    return `${phone.replace(/\D/g, '')}@${PASSWORD_LOGIN_DOMAIN}`;
  }

  async signInWithPassword() {
    this.error = '';
    if (!this.phoneIsValid()) return;
    if (!this.password) {
      this.error = 'Enter your password.';
      return;
    }

    this.busy = true;
    try {
      await signInWithEmailAndPassword(this.auth, this.passwordLoginEmail(this.phone), this.password);
      await this.auth.currentUser!.getIdToken(true);
      // Roles are cached in localStorage and only cleared on Logout, so a sign-in
      // without one inherited the last session's list and hit "no permission".
      this.authz.clearPermissions();
      this.zone.run(() => this.router.navigateByUrl(this.authSvc.returnUrl));
    } catch (err: any) {
      console.error(err);
      this.zone.run(() => (this.error = this.passwordLoginError(err?.code)));
    } finally {
      this.zone.run(() => (this.busy = false));
    }
  }

  private passwordLoginError(code: string | undefined): string {
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/invalid-login-credentials':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
      case 'auth/invalid-email':
        return 'Wrong phone number or password. First time, or forgot your password? Log in with OTP and set a new one.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Wait a few minutes, or log in with OTP.';
      case 'auth/operation-not-allowed':
        return 'Password login is not switched on yet. Log in with OTP.';
      case 'auth/network-request-failed':
        return 'No internet connection. Check your network and try again.';
      default:
        return 'Could not sign in. Try again, or log in with OTP.';
    }
  }

  sendOTP() {
    this.error = '';
    if (!this.phoneIsValid()) return;

    this.busy = true;
    signInWithPhoneNumber(this.auth, this.phone, this.recaptchaVerifier)
      .then(conf =>
        this.zone.run(() => {
          this.confirmation = conf;
        })
      )
      .catch(err => {
        console.error(err);
        this.zone.run(() => (this.error = 'Could not send the OTP. Check the number and try again.'));
      })
      .finally(() => this.zone.run(() => (this.busy = false)));
  }

  /** After a successful OTP, offer to set (or change) the password instead of going straight in. */
  async verifyOTP() {
    if (!this.confirmation) return;
    this.error = '';
    this.busy = true;
    try {
      const userCred = await this.confirmation.confirm(this.otp);
      await (userCred.user as User).reload();
      await this.auth.currentUser!.getIdToken(true);
      this.authz.clearPermissions();
      const hasPassword = this.auth.currentUser!.providerData.some(p => p.providerId === 'password');
      const accountPhone = this.auth.currentUser!.phoneNumber ?? this.phone;
      this.zone.run(() => {
        this.hasPassword = hasPassword;
        this.accountPhone = accountPhone;
        this.mode = 'setPassword';
      });
    } catch (err) {
      console.error(err);
      this.zone.run(() => (this.error = 'Wrong or expired OTP. Check the code, or send a new one.'));
    } finally {
      this.zone.run(() => (this.busy = false));
    }
  }

  async savePassword() {
    this.error = '';
    if (this.newPassword.length < MIN_PASSWORD_LENGTH) {
      this.error = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error = 'The two passwords do not match.';
      return;
    }

    const user = this.auth.currentUser;
    if (!user?.phoneNumber) {
      this.error = 'Your login has expired. Log in with OTP again.';
      return;
    }

    this.busy = true;
    try {
      if (this.hasPassword) {
        await updatePassword(user, this.newPassword);
      } else {
        // The hidden address comes from the account's own phone number, not the typed one.
        const credential = EmailAuthProvider.credential(this.passwordLoginEmail(user.phoneNumber), this.newPassword);
        await linkWithCredential(user, credential);
      }
      this.continueToApp();
    } catch (err: any) {
      console.error(err);
      this.zone.run(() => (this.error = this.savePasswordError(err?.code)));
    } finally {
      this.zone.run(() => (this.busy = false));
    }
  }

  private savePasswordError(code: string | undefined): string {
    switch (code) {
      case 'auth/weak-password':
      case 'auth/password-does-not-meet-requirements':
        return 'That password is too weak. Use a longer one with letters and numbers.';
      case 'auth/requires-recent-login':
        return 'For safety, log in with OTP again, then set the password.';
      case 'auth/email-already-in-use':
      case 'auth/credential-already-in-use':
        return 'This number already has a password on another account. Ask an admin to check it.';
      case 'auth/operation-not-allowed':
        return 'Password login is not switched on yet. You can skip this for now.';
      case 'auth/network-request-failed':
        return 'No internet connection. Check your network and try again.';
      default:
        return 'Could not save the password. Try again, or skip for now.';
    }
  }

  /** Leave the set-password step; the person is already logged in. */
  continueToApp() {
    this.zone.run(() => this.router.navigateByUrl(this.authSvc.returnUrl));
  }
}

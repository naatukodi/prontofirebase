// src/app/login.component.ts
import { Component, OnInit, inject, NgZone } from '@angular/core';
import {
  getAuth,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  User
} from 'firebase/auth';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h2>Login with Phone</h2>
    <div id="recaptcha-container" style="display:none"></div>

    <input [(ngModel)]="phone" placeholder="+91XXXXXXXXXX" />
    <button (click)="sendOTP()">Send OTP</button>

    <div *ngIf="confirmation">
      <input [(ngModel)]="otp" placeholder="123456" />
      <button (click)="verifyOTP()">Verify</button>
    </div>
  `
})
export class LoginComponent implements OnInit {
  private auth = getAuth();           // ← pure modular Auth instance
  private authSvc = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private zone = inject(NgZone);

  phone = '';
  otp = '';
  confirmation!: ConfirmationResult;
  private recaptchaVerifier!: RecaptchaVerifier;

  ngOnInit() {
    // capture returnUrl
    this.authSvc.returnUrl =
      this.route.snapshot.queryParamMap.get('returnUrl') || '/';

    // initialize invisible reCAPTCHA against the modular Auth
    this.recaptchaVerifier = new RecaptchaVerifier(
      this.auth,
      'recaptcha-container',
      { size: 'invisible' }
    );
    this.recaptchaVerifier.render().catch(console.warn);
  }

  sendOTP() {
    signInWithPhoneNumber(this.auth, this.phone, this.recaptchaVerifier)
      .then(conf =>
        // run inside Angular zone so change detection picks up `confirmation`
        this.zone.run(() => {
          this.confirmation = conf;
          console.log('🔢 OTP sent to', this.phone);
        })
      )
      .catch(err => console.error('❌ sendOTP error', err));
  }

  async verifyOTP() {
    try {
      const userCred = await this.confirmation.confirm(this.otp);
      await (userCred.user as User).reload();
      await this.auth.currentUser!.getIdToken(true);

      console.log('✅ Verified & token refreshed');
      this.router.navigateByUrl(this.authSvc.returnUrl);
    } catch (err) {
      console.error('❌ verifyOTP error', err);
    }
  }
}

// src/app/login/login.component.ts
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
  imports: [
    CommonModule,
    FormsModule,  // brings in template-driven forms
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit {
  private auth = getAuth();
  private authSvc = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private zone = inject(NgZone);

  phone = '';
  otp = '';
  confirmation!: ConfirmationResult;
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

  sendOTP() {
    if (!this.phone.match(/^\+\d{10,15}$/)) {
      alert('Enter phone in international format, e.g. +911234567890');
      return;
    }
    signInWithPhoneNumber(this.auth, this.phone, this.recaptchaVerifier)
      .then(conf =>
        this.zone.run(() => {
          this.confirmation = conf;
        })
      )
      .catch(err => {
        console.error(err);
        alert('Failed to send OTP. Check console for details.');
      });
  }

  async verifyOTP() {
    try {
      const userCred = await this.confirmation.confirm(this.otp);
      await (userCred.user as User).reload();
      await this.auth.currentUser!.getIdToken(true);
      this.router.navigateByUrl(this.authSvc.returnUrl);
    } catch (err) {
      console.error(err);
      alert('OTP verification failed. Try again.');
    }
  }
}

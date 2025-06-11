import { Component, OnInit } from '@angular/core';
import { getAuth, signInWithPhoneNumber, RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <h2>Login with Phone</h2>
    <div id="recaptcha-container"></div>
    <input [(ngModel)]="phone" placeholder="+91XXXXXXXXXX" />
    <button (click)="sendOTP()">Send OTP</button>

    <div *ngIf="confirmation">
      <input [(ngModel)]="otp" placeholder="123456" />
      <button (click)="verifyOTP()">Verify</button>
    </div>
  `
})
export class LoginComponent implements OnInit {
  private auth = getAuth();            // ← use getAuth() here
  private recaptchaVerifier!: RecaptchaVerifier;
  phone = '';
  otp = '';
  confirmation!: ConfirmationResult;

  ngOnInit() {
    this.recaptchaVerifier = new RecaptchaVerifier(
      this.auth,
      'recaptcha-container',
      { size: 'invisible' }
    );
  }

  sendOTP() {
    signInWithPhoneNumber(this.auth, this.phone, this.recaptchaVerifier)
      .then(conf => this.confirmation = conf)
      .catch(err => console.error(err));
  }

  verifyOTP() {
    this.confirmation.confirm(this.otp)
      .then(() => location.replace('/test'))
      .catch(err => console.error('Bad OTP', err));
  }
}

import { Component, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, TimeoutError } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { MarketValueService } from '../../services/market-value.service';

// --- Import all the Angular Material modules you need ---
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-market-value',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatCardModule
  ],
  templateUrl: './market-value.component.html',
  styleUrls: ['./market-value.component.scss']
})
export class MarketValueComponent {
  valueForm: FormGroup;
  loading = false;
  aiResult: string | null = null;
  error: string | null = null;

  // Slightly above the backend's own 30s ceiling on the Gemini call, so its
  // "took too long" response wins under normal conditions and this only fires
  // if the API itself is unreachable.
  private readonly requestTimeoutMs = 35000;

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private marketValueService: MarketValueService
  ) {
    this.valueForm = this.fb.group({
      vehicleType: ['Four Wheeler', Validators.required],
      make: ['', Validators.required],
      model: ['', Validators.required],
      year: ['', [Validators.required, Validators.pattern(/^(19|20)\d{2}$/)]],
      kms: ['', [Validators.required, Validators.pattern(/^[0-9]+$/)]],
      location: ['', Validators.required] 
    });
  }

  async onSubmit() {
    if (this.valueForm.invalid) {
      this.valueForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.aiResult = null;
    this.error = null;

    const f = this.valueForm.value;

    try {
      // The prompt is built server-side — this only sends the form fields.
      const response = await firstValueFrom(
        this.marketValueService
          .getMarketValue({
            vehicleType: f.vehicleType,
            make: f.make,
            model: f.model,
            year: String(f.year),
            kms: String(f.kms),
            location: f.location
          })
          .pipe(timeout(this.requestTimeoutMs))
      );

      if (response?.result) {
        this.aiResult = response.result;
      } else {
        this.error = "No valid response from AI. The model may be busy or the request was filtered. Please try again.";
      }

    } catch (e: unknown) {
      console.error('Market value request failed:', e);

      if (e instanceof TimeoutError) {
        this.error = "Request timed out. The AI server may be busy. Please try again.";
      } else if (e instanceof HttpErrorResponse) {
        // The API returns { message } for every failure it handles.
        this.error = e.error?.message
          ?? (e.status === 0
                ? "Could not reach the server. Check your connection and try again."
                : `Request failed with status ${e.status}. Please try again.`);
      } else {
        this.error = "Something went wrong while fetching the valuation. Please try again.";
      }
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
}
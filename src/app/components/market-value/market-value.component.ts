import { Component, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

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

  // ⚠️ SECURITY WARNING:
  // You must generate a NEW key in Google Cloud Console because your old one was visible.
  // Paste the new key inside the quotes below.
  private readonly apiKey = "AIzaSyCBq0c4Aah_tZc-rCJ8C_Y2YawaQhdVVu4"; 
  
  // ✅ FIX 1: Used backticks (`) below so the key is inserted correctly
  private readonly apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef 
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
    console.log("Submitting... Loading spinner is ON.");

    const formData = this.valueForm.value;
    const userPrompt = this.buildPrompt(formData);
    
    const systemPrompt = "You are an expert vehicle valuer for the Indian market. Your goal is to provide a realistic, single-paragraph market value assessment for a used vehicle. State the estimated price range clearly in Rupees. Do not use markdown or bullet points. Provide the answer in a concise, professional paragraph.";

    const payload = {
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      // Removed google_search tool as it sometimes requires extra permissions
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log("Request timed out after 30 seconds.");
      controller.abort();
    }, 30000); 

    try {
      console.log("Calling AI API at:", this.apiUrl);
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId); 
      console.log("API response received."); 

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('API Error Response Body:', errorBody); 
        
        if (response.status === 400) {
          throw new Error('API key not valid. Please check your key in the .ts file.');
        }
        // ✅ FIX 2: Used backticks (`) for error message interpolation
        throw new Error(`API call failed with status ${response.status}. See console for error body.`);
      }

      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (text) {
        console.log("AI result success:", text);
        this.aiResult = text;
      } else {
        console.error('No text in AI response:', result); 
        this.error = "No valid response from AI. The model may be busy or the request was filtered. Please try again.";
      }

    } catch (e: any) {
      clearTimeout(timeoutId); 
      console.error("--- CATCH BLOCK EXECUTED ---", e); 

      if (e.name === 'AbortError') {
        this.error = "Request timed out after 30 seconds. The AI server may be busy. Please try again.";
      } else {
        // ✅ FIX 3: Used backticks (`) for error message interpolation
        this.error = `Request Failed: ${e.message}. Open the browser console (F12) to see the full error.`;
      }
    } finally {
      console.log("Finally block executed. Setting loading to false."); 
      this.loading = false;
      this.cdr.detectChanges(); 
    }
  }

  private buildPrompt(data: any): string {
    // Used backticks (`) here correctly
    return `Please provide the estimated market value for the following vehicle:
    - Vehicle Type: ${data.vehicleType}
    - Make: ${data.make}
    - Model: ${data.model}
    - Manufacturing Year: ${data.year}
    - Kilometers Driven: ${data.kms} km
    - Location: ${data.location}, India`;
  }
}
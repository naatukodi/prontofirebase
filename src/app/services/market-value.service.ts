// src/app/services/market-value.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MarketValueRequest {
  vehicleType: string;
  make: string;
  model: string;
  year: string;
  kms: string;
  location: string;
}

export interface MarketValueResponse {
  result: string;
}

@Injectable({ providedIn: 'root' })
export class MarketValueService {
  private readonly url = `${environment.apiBaseUrl}market-value`;

  constructor(private http: HttpClient) {}

  /**
   * Asks the backend for a single-paragraph AI valuation. The Gemini key lives
   * server-side — this call carries no credentials of its own.
   */
  getMarketValue(request: MarketValueRequest): Observable<MarketValueResponse> {
    return this.http.post<MarketValueResponse>(this.url, request);
  }
}

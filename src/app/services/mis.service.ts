// src/app/services/mis.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MisRow } from '../models/mis-row.model';

@Injectable({ providedIn: 'root' })
export class MisService {
  private readonly url = `${environment.apiBaseUrl}valuations/mis`;

  constructor(private http: HttpClient) {}

  /**
   * Fetch MIS rows for a lead-creation date range (inclusive).
   * from/to are ISO strings; status/client/state are optional filters.
   */
  getMis(
    from: string,
    to: string,
    filters?: { status?: string; client?: string; state?: string }
  ): Observable<MisRow[]> {
    let params = new HttpParams().set('from', from).set('to', to);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.client) params = params.set('client', filters.client);
    if (filters?.state)  params = params.set('state', filters.state);

    return this.http.get<MisRow[]>(this.url, { params });
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PincodeModel {
  name:    string;
  block:   string;
  state:   string;
  country: string;
  pincode: string;
}

@Injectable({ providedIn: 'root' })
export class PincodeService {
  private readonly pinCodeUrl = environment.apiBaseUrl + 'Pincodes';

  constructor(private http: HttpClient) {}

  lookup(pin: string): Observable<PincodeModel[]> {
    return this.http.get<PincodeModel[]>(
      `${this.pinCodeUrl}/${pin}`
    );
  }
}

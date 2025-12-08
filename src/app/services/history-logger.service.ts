import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HistoryLoggerService {
  private apiBaseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) { }

  async logAction(
    valuationId: string,
    action: string,
    remarks: string = '',
    performedByUserId: string = 'unknown',
    performedByUserName: string = 'Unknown User',
    statusFrom: string | null = null,
    statusTo: string | null = null
  ): Promise<void> {
    try {
      await this.http.post(
        `${this.apiBaseUrl}/valuations/${valuationId}/workflow/addhistory`,
        {
          ValuationId: valuationId,
          DateTime: new Date().toISOString(),
          Action: action,
          Remarks: remarks,
          PerformedByUserId: performedByUserId,
          PerformedByUserName: performedByUserName,
          StatusFrom: statusFrom,
          StatusTo: statusTo,
          CurrentTat: 0,
          TotalTat: 0,
          FirstDateTime: null,
          FirstUpdate: false,
          StatusChange: statusFrom && statusTo ? true : false,
          StatusChangedDateTime: new Date().toISOString(),
          PreviousStatus: statusFrom,
          CurrentStatus: statusTo
        }
      ).toPromise();
      
      console.log('✅ Action logged:', action);
    } catch (error: any) {
      console.error('❌ Error logging action:', error);
    }
  }
}

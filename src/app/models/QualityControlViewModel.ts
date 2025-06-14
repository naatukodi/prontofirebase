// src/app/models/QualityControlViewModel.ts

import { QualityControl } from './QualityControl';
import { ValuationEstimate } from './ValuationEstimate';

export interface QualityControlViewModel {
  // All fields from QualityControl
  overallRating: string;
  valuationAmount: number;
  chassisPunch: string;
  remarks: string;

  // All fields from ValuationEstimate
  lowRange: number;
  midRange: number;
  highRange: number;
  rawResponse: string;
}

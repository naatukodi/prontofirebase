// src/app/models/ValuationEstimate.ts

export interface ValuationEstimate {
  lowRange: number;
  midRange: number;
  highRange: number;
  rawResponse: string;
  // The listings the range was worked out from, and when they were read.
  // Absent on ranges made before the backend searched listing sites.
  rationale?: string | null;
  comparables?: ValuationComparable[] | null;
  generatedAt?: string | null;
}

export interface ValuationComparable {
  site: string;
  title?: string | null;
  url?: string | null;
  price?: number | null;
  year?: number | null;
  km?: number | null;
  location?: string | null;
}

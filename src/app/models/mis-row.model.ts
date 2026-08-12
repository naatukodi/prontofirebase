// src/app/models/mis-row.model.ts
// One MIS report row — the 24 columns of MIS FORMAT.xlsx, returned by
// GET /api/valuations/mis (camelCase JSON from the .NET MisController).
export interface MisRow {
  uniqId: string;
  clientName: string;
  clientState: string;
  branch: string;
  inspectionType: string;
  leadCreationDateTime: string;
  inspectionDateTime: string;
  approvedDateTime: string;
  leadStatus: string;
  tat: string;
  vehicleNo: string;
  ownerName: string;
  applicantName: string;
  mobileNo: string;
  make: string;
  model: string;
  variant: string;
  vehicleCategory: string;
  inspector: string;
  year: string;
  vehicleClass: string;
  valuationPrice: number | null;
  executiveName: string;
  executiveMobile: string;
  paymentStatus: string;
  paymentMode: string;
  /** UTR / transaction reference (free text as entered). */
  paymentReference: string;
  paymentAmount: number | null;
  paymentDate: string;
}

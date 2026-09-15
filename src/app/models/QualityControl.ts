// src/app/models/QualityControl.ts

export interface QualityControl {
  overallRating: string;
  valuationAmount: number;
  chassisPunch: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
  assignedTo: string;
  assignedToPhoneNumber: string;
  assignedToEmail: string;
  assignedToWhatsapp: string;
  qcChecklist?: Record<string, string | null>;
  qcChecklistRemarks?: Record<string, string>;
  /** Checklist keys the reviewer decided themselves, as opposed to the
   *  system or the photo reader. Only these are protected from a re-read. */
  qcChecklistReviewerKeys?: string[];
}

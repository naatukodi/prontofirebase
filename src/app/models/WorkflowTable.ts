export interface WorkflowTable {
  valuationId: string;
  vehicleNumber: string;
  applicantName: string;
  applicantContact: string;

  workflow: string;
  workflowStepOrder: number;
  status: string;

  createdAt: string;
  completedAt: string | null;
  updatedAt: string | null;

  assignedTo: string | null;
  assignedToPhoneNumber: string;
  assignedToEmail: string;
  assignedToWhatsapp: string;

  redFlag: string | null;
  remarks: string | null;

  location: string;
  name: string;
  valuationType: string;

  // ==============================
  // ✅ PAYMENT FIELDS (NEW)
  // ==============================
  paymentStatus?: string | null;        // Completed / Pending / Failed
  paymentReference?: string | null;     // Transaction ID / Reference
  paymentDate?: string | null;          // ISO date string
  paymentMethod?: string | null;        // Online / Cash / UPI / Card
  paymentAmount?: number | null;        // Amount
}

export interface LeadHistoryDto {
  action: string;
  statusFrom: string;
  statusTo: string;
  performedByUserName: string;
  remarks?: string;
  dateTime: string;
}

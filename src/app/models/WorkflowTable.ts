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
}

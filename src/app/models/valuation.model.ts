// src/app/models/valuation.model.ts
export interface Valuation {
  id: string;
  vehicleNumber: string;
  applicantName: string;
  applicantContact: string;
  createdAt: string;
  inProgressWorkflow: Array<{
    stepOrder: number;
    templateStepId: number;
    assignedToRole: string;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
  }>;
}

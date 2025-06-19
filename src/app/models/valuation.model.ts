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

export interface WFValuation {
  valuationId: string;          // “cd8cb1dd-0343…”
  vehicleNumber: string;        // “MH02CD5678”
  applicantName: string;        // “Tiru”
  applicantContact: string;     // “9620027500”
  workflow: string;             // e.g. “Stakeholder”
  workflowStepOrder: number;    // 1, 2, 3…
  status: string;               // “InProgress”, “Completed”, etc.
  createdAt: string;            // ISO date
  completedAt: string | null;
  assignedTo: string | null;    // e.g. “John Doe”
  assignedToPhoneNumber: string | null; // e.g. “9876543210”
  assignedToEmail: string | null; // e.g. “john.doe@example.com”
  assignedToWhatsapp: string | null; // e.g. “+919876543210”
  redFlag: boolean | null;      // true/false or null
  remarks: string | null;        // e.g. “Pending documents”
  location: string | null;       // e.g. “Mumbai, India”
  valuationType: string | null; // e.g. Car, Bike, Truck
  name: string;            // e.g. "SBI"
  // …and any of the other fields you care about
}
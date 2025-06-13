export interface Stakeholder {
    name: string;
    executiveName: string;
    executiveContact: string;
    executiveWhatsapp: string;
    applicant: any; // or a proper type if needed
  }
  
  export interface Applicant {
    name: string;
    contact: string;
    vehicleDetails: any;
  }
  
  export interface VehicleDetails {
    registrationNumber: string;
    segment: string;
    make: string;
    model: string;
    yearMfg: number;
    presentAddress: string;
    permanentAddress: string;
    hypothecation: boolean;
    insurer: string;
    dateOfRegistration: string;
    vehicleClass: string;
    engineCC: number;
    gvw: number;
    seatingCapacity: number;
    policyValidUpTo: string;
    idv: number;
    permitNo: string | null;
    permitValidUpTo: string | null;
    documents: any[];
  }
  
  export interface Document {
    type: string;
    filePath: string;
    uploadedAt: string;
    components: any[];
  }
  
  export interface Component {
    componentTypeId: number;
    condition: string;
    remarks: string;
    summary: any;
  }
  
  export interface Summary {
    overallRating: number;
    valuationAmount: number;
    chassisPunch: string;
    remarks: string;
    workflow: any[];
  }
  
  export interface WorkflowStep {
    templateStepId: number;
    stepOrder: number;
    assignedToRole: string;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
  }
  
 export interface Claim {
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
  
  export type Valuation = Claim;
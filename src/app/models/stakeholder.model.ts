export interface VehicleLocation {
  pincode:   string | null;
  name:      string | null;
  block:     string | null;
  state:     string | null;
  country:   string | null;
  district:  string | null;
  division:  string | null;
}

// src/app/models/stakeholder.model.ts
export interface Stakeholder {
  id: string;
  name: string;
  branch?: string | null;
  executiveName: string;
  executiveContact: string;
  executiveWhatsapp: string;
  executiveEmail: string;
  vehicleSegment: string;
  vehicleNumber?: string | null;
  vehicleLocation: VehicleLocation;
  valuationType: string;
  applicant: {
    name: string;
    contact: string;
    alternativeContact?: string | null;
  };
  documents: Array<{
    type: string;
    filePath: string;
    uploadedAt: string;
  }>;
  remarks?: string | null;
}

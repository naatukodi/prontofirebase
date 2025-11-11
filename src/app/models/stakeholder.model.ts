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
  executiveName: string;
  executiveContact: string;
  executiveWhatsapp: string;
  executiveEmail: string;
  vehicleSegment: string;
  vehicleLocation: VehicleLocation;
  valuationType: string;
  location: string;
  applicant: {
    name: string;
    contact: string;
  };
  documents: Array<{
    type: string;
    filePath: string;
    uploadedAt: string;
  }>;
  remarks?: string | null;
}

// src/app/models/stakeholder.model.ts
export interface Stakeholder {
  name: string;
  executiveName: string;
  executiveContact: string;
  executiveWhatsapp: string;
  executiveEmail: string;
  vehicleSegment: string;
  applicant: {
    name: string;
    contact: string;
  };
  documents: Array<{
    type: string;
    filePath: string;
    uploadedAt: string;
  }>;
}

// src/app/models/VehicleDetails.ts
export interface DocumentInfo {
  type: string;
  filePath: string;
  uploadedAt: string; // ISO date string
}

export interface VehicleDetails {
  registrationNumber: string;
  make: string;
  model: string;
  monthOfMfg: number;
  yearOfMfg: number;
  bodyType: string;
  chassisNumber: string;
  engineNumber: string;
  colour: string;
  fuel: string;
  ownerName: string;
  presentAddress: string;
  permanentAddress: string;
  hypothecation: boolean;
  insurer: string;
  dateOfRegistration: string; // ISO
  classOfVehicle: string;
  engineCC: number;
  grossVehicleWeight: number;
  ownerSerialNo: string;
  seatingCapacity: number;
  insurancePolicyNo: string;
  insuranceValidUpTo: string; // ISO
  idv: number;
  permitNo: string;
  permitValidUpTo: string; // ISO
  fitnessNo: string;
  fitnessValidTo: string; // ISO
  backlistStatus: boolean;
  rcStatus: boolean;
  stencilTraceUrl: string;
  chassisNoPhotoUrl: string;
  stencilTrace: string;
  chassisNoPhoto: string;
  documents: DocumentInfo[];
  rto: string;
  lender: string;
  exShowroomPrice: number;
  categoryCode: string;
  normsType: string;
  makerVariant: string;
  pollutionCertificateNumber: string;
  pollutionCertificateUpto: string; // ISO
  permitType: string;
  permitIssued: string; // ISO
  permitFrom: string; // ISO
  taxUpto: string; // ISO
  taxPaidUpto: string;
  manufacturedDate: string; // ISO
}

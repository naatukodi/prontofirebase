// src/app/models/user.model.ts
export interface UserModel {
  userId: string;
  name: string;
  email: string;
  roleId: string;
  whatsapp: string | null;
  phoneNumber: string | null;
  description: string | null;
  branchType: string | null;
  serviceStatus: string;
  circle: string | null;
  district: string | null;
  division: string | null;
  region: string | null;
  block: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  assignedDistricts: string | null;
  assignedStates: string | null;
}

export interface AssignableUser {
  userId: string;        // e.g. "+919885855567" (preferred for phone with +)
  name: string;
  email: string | null;
  phoneNumber: string | null;   // e.g. "9885855567"
  whatsapp: string | null;
}
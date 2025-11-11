export interface CommonNote {
  id: string;
  entityType: string;
  entityId: string;
  note: string;
  createdDate: Date;
  modifiedDate?: Date;
  createdBy: string;
  modifiedBy?: string;
}

export interface CreateCommonNoteDto {
  entityType: string;
  entityId: string;
  note: string;
  createdBy: string;
}

export interface UpdateCommonNoteDto {
  note: string;
  modifiedBy: string;
}

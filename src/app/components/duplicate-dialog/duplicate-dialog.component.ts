import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { VehicleDuplicateCheckResponse } from '../../models/vehicle-duplicate-check.interface';
import { brandName } from '../../services/brand.service';

@Component({
  selector: 'app-duplicate-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './duplicate-dialog.component.html',
  styleUrls: ['./duplicate-dialog.component.scss']
})
export class DuplicateDialogComponent {

  /** Dedupe spans both companies, so each match has to say which one it sits in. */
  readonly brandName = brandName;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: VehicleDuplicateCheckResponse,
    public dialogRef: MatDialogRef<DuplicateDialogComponent>
  ) {}

  /** Whether there is a table to show. A check that came back empty has none. */
  get hasDuplicates(): boolean {
    return (this.data?.existingRecords?.length ?? 0) > 0;
  }
}

import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { VehicleDuplicateCheckResponse } from '../../models/vehicle-duplicate-check.interface';

@Component({
  selector: 'app-duplicate-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './duplicate-dialog.component.html',
  styleUrls: ['./duplicate-dialog.component.scss']
})
export class DuplicateDialogComponent {

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

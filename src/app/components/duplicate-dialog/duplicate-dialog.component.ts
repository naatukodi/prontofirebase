import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { VehicleDuplicateCheckResponse } from '../../models/vehicle-duplicate-check.interface';

@Component({
  selector: 'app-duplicate-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './duplicate-dialog.component.html',
  styleUrls: ['./duplicate-dialog.component.scss']
})
export class DuplicateDialogComponent {

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: VehicleDuplicateCheckResponse
  ) {}

}
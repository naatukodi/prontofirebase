import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowService } from '../../services/workflow.service';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialogRef } from '@angular/material/dialog';
import { Optional } from '@angular/core';

export interface LeadHistoryDto {
  valuationId: string;
  dateTime: string;
  action?: string;
  remarks?: string;

  performedByUserId?: string;
  performedByUserName?: string;

  statusFrom?: string;
  statusTo?: string;

  currentTat: number;
  totalTat: number;

  firstDateTime?: string;
  firstUpdate: boolean;
  statusChange: boolean;
  statusChangedDateTime: string;

  previousStatus?: string;
  currentStatus?: string;
}


@Component({
  selector: 'app-case-history',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './case-history.component.html'
})
export class CaseHistoryComponent implements OnInit {

  valuationId!: string;

  history: LeadHistoryDto[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private workflowService: WorkflowService,
    @Inject(MAT_DIALOG_DATA) public data: { valuationId: string },
    @Optional() private dialogRef?: MatDialogRef<CaseHistoryComponent>
  ) {
    this.valuationId = data.valuationId;
  }

  ngOnInit(): void {
    if (!this.valuationId) {
      this.error = 'Invalid valuation ID';
      this.loading = false;
      return;
    }

    this.loadHistory();
  }

  loadHistory(): void {
    this.workflowService.getHistory(this.valuationId).subscribe({
      next: (data) => {
        this.history = data.sort(
          (a, b) =>
            new Date(b.dateTime).getTime() -
            new Date(a.dateTime).getTime()
        );
        this.loading = false;
      },
      error: (err) => {
        console.error('History load error:', err);
        this.error = 'Failed to load history';
        this.loading = false;
      }
    });
  }

  closeDialog(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleString();
  }
}

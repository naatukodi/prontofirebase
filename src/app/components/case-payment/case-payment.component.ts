import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { WorkflowService } from '../../services/workflow.service';
import { AuthorizationService } from '../../services/authorization.service';

@Component({
  selector: 'app-case-payment',
  standalone: true,
  imports: [CommonModule, MatDialogModule, FormsModule],
  templateUrl: './case-payment.component.html',
  styleUrls: ['./case-payment.component.scss']
})
export class CasePaymentComponent implements OnInit {

  paymentStatus = '';
  paymentReference = '';
  paymentDate = '';
  paymentMethod = '';
  paymentAmount: number | null = null;
  paymentNotes = '';

  savedBy: string | null = null;
  savedAt: Date | null = null;

  saving = false;
  loading = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<CasePaymentComponent>,
    private workflowService: WorkflowService,
    private authz: AuthorizationService
  ) {}

  ngOnInit(): void {
    this.loadPayment();
  }

  loadPayment(): void {
    this.loading = true;

    this.workflowService
      .getPayment(this.data.valuationId)
      .subscribe({
        next: (payment) => {
          if (!payment) {
            this.loading = false;
            return;
          }

          this.paymentStatus    = payment.paymentStatus    ?? '';
          this.paymentReference = payment.paymentReference ?? '';
          this.paymentMethod    = payment.paymentMethod    ?? '';
          this.paymentAmount    = payment.paymentAmount    ?? null;
          this.paymentNotes     = payment.paymentNotes     ?? '';
          this.savedBy          = payment.savedBy          ?? null;
          this.savedAt          = payment.savedAt ? new Date(payment.savedAt) : null;

          if (payment.paymentDate) {
            const d = new Date(payment.paymentDate);
            this.paymentDate = d.toISOString().slice(0, 16);
          }

          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  canEdit(): boolean {
    return this.authz.hasAnyPermission([
      'CanCreateInspection',
      'CanEditInspection',
      'CanCreateQualityControl',
      'CanEditQualityControl',
      'CanCreateFinalReport',
      'CanEditFinalReport'
    ]);
  }

  save(): void {
    if (!this.canEdit()) return;

    const isPending = this.paymentStatus === 'Pending';

    if (!this.paymentStatus || !this.paymentAmount) {
      alert('Please fill all required payment fields.');
      return;
    }

    if (!isPending && (!this.paymentMethod || !this.paymentDate)) {
      alert('Please fill Method and Date fields.');
      return;
    }

    this.saving = true;

    this.workflowService.savePayment({
      valuationId:      this.data.valuationId,
      vehicleNumber:    this.data.vehicleNumber,
      applicantContact: this.data.applicantContact,
      paymentStatus:    this.paymentStatus,
      paymentReference: this.paymentReference,
      paymentDate:      this.paymentDate ? new Date(this.paymentDate).toISOString() : null,
      paymentMethod:    this.paymentMethod,
      paymentAmount:    this.paymentAmount!,
      paymentNotes:     this.paymentNotes,
      savedBy:          this.data.currentUserName ?? 'Unknown'
    }).subscribe({
      next: () => {
        this.saving = false;
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error(err);
        this.saving = false;
        alert('Failed to save payment details.');
      }
    });
  }
}

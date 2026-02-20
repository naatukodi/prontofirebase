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

  saving = false;
  loading = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<CasePaymentComponent>,
    private workflowService: WorkflowService,
    private authz: AuthorizationService
  ) {}

  // ===============================
  // LOAD PAYMENT WHEN DIALOG OPENS
  // ===============================
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

          this.paymentStatus = payment.paymentStatus ?? '';
          this.paymentReference = payment.paymentReference ?? '';
          this.paymentMethod = payment.paymentMethod ?? '';
          this.paymentAmount = payment.paymentAmount ?? null;
          this.paymentNotes = payment.paymentNotes ?? '';

          if (payment.paymentDate) {
            const d = new Date(payment.paymentDate);
            this.paymentDate = d.toISOString().slice(0, 16);
          }

          this.loading = false;
        },
        error: () => {
          // No payment saved yet — that’s fine
          this.loading = false;
        }
      });
  }

  // ===============================
  // PERMISSION CHECK
  // ===============================
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

  // ===============================
  // SAVE PAYMENT
  // ===============================
  save(): void {
    if (!this.canEdit()) return;

    if (!this.paymentStatus ||
        !this.paymentMethod ||
        !this.paymentDate ||
        !this.paymentAmount) {
      alert('Please fill all required payment fields.');
      return;
    }

    this.saving = true;

    this.workflowService.savePayment({
      valuationId: this.data.valuationId,
      vehicleNumber: this.data.vehicleNumber,
      applicantContact: this.data.applicantContact,
      paymentStatus: this.paymentStatus,
      paymentReference: this.paymentReference,
      paymentDate: new Date(this.paymentDate).toISOString(),
      paymentMethod: this.paymentMethod,
      paymentAmount: this.paymentAmount!,
      paymentNotes: this.paymentNotes
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

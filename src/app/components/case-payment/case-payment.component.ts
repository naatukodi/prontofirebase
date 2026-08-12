import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
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
export class CasePaymentComponent implements OnInit, OnDestroy {

  /** Payment times are always shown and entered in IST, whatever timezone the
   *  browser is in, and always stored as UTC. IST has no DST, so a fixed
   *  offset is exact. */
  private static readonly IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  readonly istTimezone = '+0530';


  paymentStatus = '';
  paymentReference = '';
  paymentDate = '';
  paymentMethod = '';
  paymentAmount: number | null = null;
  paymentNotes = '';

  savedBy: string | null = null;
  savedAt: Date | null = null;

  /** Snapshot of what is currently stored on the case, shown as a read-back
   *  summary above the form. Null until something has been saved. */
  saved: {
    status: string;
    method: string;
    reference: string;
    date: Date | null;
    amount: number | null;
    notes: string;
    savedBy: string | null;
    savedAt: Date | null;
  } | null = null;

  saving = false;
  loading = false;

  /** While true the date field tracks the current IST time, so a payment taken
   *  now is stamped with the moment it is saved. Editing the field, or a date
   *  already saved on the case, switches it off. */
  dateIsLive = true;
  private clockId: any = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<CasePaymentComponent>,
    private workflowService: WorkflowService,
    private authz: AuthorizationService
  ) {}

  ngOnInit(): void {
    this.paymentDate = this.toIstInputValue(new Date());
    this.clockId = setInterval(() => {
      if (this.dateIsLive && !this.saving) {
        this.paymentDate = this.toIstInputValue(new Date());
      }
    }, 1000);

    this.loadPayment();
  }

  ngOnDestroy(): void {
    if (this.clockId !== null) clearInterval(this.clockId);
  }

  /** IST wall-clock string for a datetime-local input ("YYYY-MM-DDTHH:mm").
   *  Built from UTC parts shifted by the IST offset, so it is correct even if
   *  the browser is in another timezone. */
  private toIstInputValue(instant: Date): string {
    const ist = new Date(instant.getTime() + CasePaymentComponent.IST_OFFSET_MS);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}`
         + `T${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}`;
  }

  /** Reads an IST wall-clock input value back as a UTC ISO instant. */
  private istInputValueToIso(value: string): string | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
    if (!m) return null;
    const [, y, mo, d, h, mi] = m.map(Number) as unknown as number[];
    const utcMs = Date.UTC(y, mo - 1, d, h, mi) - CasePaymentComponent.IST_OFFSET_MS;
    return new Date(utcMs).toISOString();
  }

  /** Called when the user edits the date field — stops the live clock. */
  onDateEdited(): void {
    this.dateIsLive = false;
  }

  useNow(): void {
    this.dateIsLive = true;
    this.paymentDate = this.toIstInputValue(new Date());
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

          // A date already on the case wins over the live clock. Shown in IST,
          // not UTC — filling a datetime-local input with an ISO UTC string
          // displayed the time 5:30 behind and shifted it further on each save.
          if (payment.paymentDate) {
            this.paymentDate = this.toIstInputValue(new Date(payment.paymentDate));
            this.dateIsLive = false;
          }

          // Keep a snapshot of the stored values so the summary card shows
          // what is saved on the case, not what is being edited below.
          if (this.paymentStatus || this.paymentAmount != null) {
            this.saved = {
              status:    this.paymentStatus,
              method:    this.paymentMethod,
              reference: this.paymentReference,
              date:      payment.paymentDate ? new Date(payment.paymentDate) : null,
              amount:    this.paymentAmount,
              notes:     this.paymentNotes,
              savedBy:   this.savedBy,
              savedAt:   this.savedAt
            };
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
      paymentDate:      this.dateIsLive
                          ? new Date().toISOString()
                          : (this.paymentDate ? this.istInputValueToIso(this.paymentDate) : null),
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

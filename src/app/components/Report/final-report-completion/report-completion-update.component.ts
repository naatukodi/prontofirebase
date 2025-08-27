import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SharedModule } from '../../shared/shared.module/shared.module';
import { WorkflowButtonsComponent } from '../../workflow-buttons/workflow-buttons.component';
import { Auth, User, authState } from '@angular/fire/auth';
import { take, switchMap, of, map } from 'rxjs';
import { ValuationResponseService } from '../../../services/valuation-response.service';
import { UsersService } from '../../../services/users.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-report-completion-update',
  standalone: true,
  imports: [SharedModule, WorkflowButtonsComponent, RouterModule],
  templateUrl: './report-completion-update.component.html',
  styleUrls: ['./report-completion-update.component.scss']
})
export class ReportCompletionUpdateComponent implements OnInit {
  valuationId!: string;
  vehicleNumber!: string;
  applicantContact!: string;
  valuationType!: string;

  form!: FormGroup;
  loading = true;
  error: string | null = null;
  saving = false;
  saveInProgress = false;
  submitInProgress = false;

  private currentUser: User | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private _snackBar: MatSnackBar,
    private auth: Auth,
    private vrSvc: ValuationResponseService,
    private usersSvc: UsersService
  ) {}

  ngOnInit(): void {
    this.valuationId = this.route.snapshot.paramMap.get('valuationId')!;
    this.route.queryParamMap.subscribe(params => {
      const vn = params.get('vehicleNumber');
      const ac = params.get('applicantContact');
      this.valuationType = params.get('valuationType') || '';
      if (vn && ac) {
        this.vehicleNumber = vn;
        this.applicantContact = ac;
        this.initForm();
        this.hydrateUserDefaults();
      } else {
        this.loading = false;
        this.error = 'Missing vehicleNumber or applicantContact in query parameters.';
      }
    });
  }

  private initForm(): void {
    const nowLocal = this.toLocalDateTimeInput(new Date());
    this.form = this.fb.group({
      status: ['Completed', Validators.required],
      completedAt: [nowLocal, Validators.required],           // datetime-local
      completedBy: ['', Validators.required],

      paymentStatus: ['Completed', Validators.required],
      paymentReference: ['Paytm'],
      paymentDate: [nowLocal, Validators.required],           // datetime-local
      paymentMethod: ['Online', Validators.required],
      paymentAmount: [800, [Validators.required, Validators.min(0)]]
    });
  }

  private hydrateUserDefaults(): void {
    authState(this.auth).pipe(take(1)).subscribe(u => {
      this.currentUser = u;
      this.resolveDisplayName(u).pipe(take(1)).subscribe(name => {
        const completedBy = (name?.trim() || this.fallbackName(u)) || 'User';
        this.form.patchValue({ completedBy });
        this.loading = false;
      });
    });
  }

  private resolveDisplayName(u: User | null) {
    if (!u) return of('');
    const id = u.phoneNumber ?? u.uid ?? u.email ?? null;
    if (!id) return of(this.fallbackName(u));
    return this.usersSvc.getById(id).pipe(
      map(m => (m?.name?.trim() || this.fallbackName(u)))
    );
  }
  private fallbackName(u: User | null): string {
    return (u?.displayName || u?.email || u?.phoneNumber || '') ?? '';
  }

  // Convert a Date to the yyyy-MM-ddTHH:mm format needed by <input type="datetime-local">
  private toLocalDateTimeInput(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // Convert datetime-local string to ISO string with Z
  private toIsoUtc(datetimeLocal: string): string {
    // Interpret local time and convert to UTC ISO
    const date = new Date(datetimeLocal);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString();
  }

  private buildPayload() {
    const v = this.form.getRawValue();
    return {
      status: v.status,                                 // "Completed"
      completedAt: this.toIsoUtc(v.completedAt),        // ISO with Z
      completedBy: v.completedBy,

      paymentStatus: v.paymentStatus,                   // "Completed"
      paymentReference: v.paymentReference || null,
      paymentDate: this.toIsoUtc(v.paymentDate),        // ISO with Z
      paymentMethod: v.paymentMethod,                   // "Online"
      paymentAmount: String(v.paymentAmount ?? '')      // as string to match cURL
    };
  }

  onSaveDraft(): void {
    // Just keep values locally / optionally persist to your own draft store if you have one
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.saveInProgress = true;

    // Simulate a quick local save UX
    setTimeout(() => {
      this.saving = false;
      this.saveInProgress = false;
      this._snackBar.open('Draft saved locally', 'Close', { duration: 2000, horizontalPosition: 'center', verticalPosition: 'top' });
    }, 300);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.submitInProgress = true;

    const payload = this.buildPayload();
    this.vrSvc.completeValuationResponse(
      this.valuationId,
      this.vehicleNumber,
      this.applicantContact,
      payload
    ).subscribe({
      next: () => {
        this.saving = false;
        this.submitInProgress = false;
        this._snackBar.open('Report marked as Completed', 'Close', { duration: 3000, horizontalPosition: 'center', verticalPosition: 'top' });
        // Navigate back to report/summary page as needed
        this.router.navigate(['/valuation', this.valuationId, 'final-report'], {
          queryParams: {
            vehicleNumber: this.vehicleNumber,
            applicantContact: this.applicantContact,
            valuationType: this.valuationType
          }
        });
      },
      error: (err) => {
        this.error = err?.message || 'Completion failed.';
        this.saving = false;
        this.submitInProgress = false;
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/valuation', this.valuationId, 'final-report'], {
      queryParams: {
        vehicleNumber: this.vehicleNumber,
        applicantContact: this.applicantContact,
        valuationType: this.valuationType
      }
    });
  }
}

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router }   from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StakeholderService } from '../../../services/stakeholder.service';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { WorkflowService } from '../../../services/workflow.service';
import { ValuationService } from '../../../services/valuation.service'; // Import if needed for other services
import { SharedModule } from '../../shared/shared.module/shared.module';
import { WorkflowButtonsComponent } from '../../workflow-buttons/workflow-buttons.component';
import { RouterModule, Routes } from '@angular/router';

@Component({
  selector: 'app-stakeholder-update',
  imports: [SharedModule, WorkflowButtonsComponent, RouterModule],
  templateUrl: './stakeholder-update.component.html',
  styleUrls: ['./stakeholder-update.component.scss'],
  standalone: true
})
export class StakeholderUpdateComponent implements OnInit {
  valuationId!: string;
  vehicleNumber!: string;
  applicantContact!: string;

stakeholderOptions: string[] = [
  'State Bank of India (SBI)',
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'IndusInd Bank',
  'Punjab National Bank (PNB)',
  'Federal Bank',
  'Union Bank of India',
  'Bank of Baroda',
  'IDFC FIRST Bank',
  'Karur Vysya Bank',
  'Kotak Mahindra Bank',
  'Mahindra Finance',
  'Bajaj Finserv',
  'Hero FinCorp',
  'TVS Credit Services',
  'Shriram Finance',
  'Muthoot Capital Services',
  'Cholamandalam Investment and Finance Company',
  'Sundaram Finance',
  'Manappuram Finance',
  'L&T Finance'
]; 
  form!: FormGroup;
  loading = true;
  error: string | null = null;

  saving = false;
  saveInProgress = false;
  submitInProgress = false;

  rcFile?: File;
  insuranceFile?: File;
  otherFiles: File[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private svc: StakeholderService,
    private valuationSvc: ValuationService,
    private workflowSvc: WorkflowService
  ) {}

  ngOnInit(): void {
    // Read route + query params
    this.valuationId = this.route.snapshot.paramMap.get('valuationId')!;
    this.route.queryParamMap.subscribe(params => {
      this.vehicleNumber    = params.get('vehicleNumber')!;
      this.applicantContact = params.get('applicantContact')!;
      this.initForm();
      this.loadStakeholder();
    });
  }

  private initForm() {
    this.form = this.fb.group({
      stakeholderName:           ['', Validators.required],
      stakeholderExecutiveName:  ['', Validators.required],
      stakeholderExecutiveContact:['', Validators.required],
      stakeholderExecutiveWhatsapp: [''],
      stakeholderExecutiveEmail: ['',
        [Validators.email]
      ],
      applicantName:             ['', Validators.required],
      applicantContact:          [this.applicantContact, Validators.required],
      vehicleNumber:             ['', Validators.required],
      vehicleSegment:            ['', Validators.required]
    });
  }

  private loadStakeholder() {
    this.loading = true;
    this.error   = null;

    this.svc.getStakeholder(
      this.valuationId,
      this.vehicleNumber,
      this.applicantContact
    ).subscribe({
      next: data => {
        // patch form with existing API data
        this.form.patchValue({
          stakeholderName:           data.name,
          stakeholderExecutiveName:  data.executiveName,
          stakeholderExecutiveContact: data.executiveContact,
          stakeholderExecutiveWhatsapp: data.executiveWhatsapp,
          stakeholderExecutiveEmail: data.executiveEmail,
          applicantName:             data.applicant.name,
          applicantContact:          data.applicant.contact,
          vehicleNumber:             this.vehicleNumber
        });
        this.loading = false;
      },
      error: err => {
        this.error   = err.message || 'Failed to load stakeholder';
        this.loading = false;
      }
    });
  }

  // single-file handler
  onFileChange(event: Event, field: 'rcFile' | 'insuranceFile') {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this[field] = input.files[0];
    }
  }

  // multi-file handler
  onMultiFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.otherFiles = input.files ? Array.from(input.files) : [];
  }

  // build FormData for either save or submit
  private buildFormData(): FormData {
    const fd = new FormData();
    const v = this.form.getRawValue();

    fd.append('name', v.stakeholderName);
    fd.append('executiveName', v.stakeholderExecutiveName);
    fd.append('executiveContact', v.stakeholderExecutiveContact);
    fd.append('executiveWhatsapp', v.stakeholderExecutiveWhatsapp || '');
    fd.append('executiveEmail', v.stakeholderExecutiveEmail || '');
    fd.append('applicantName', v.applicantName);
    fd.append('applicantContact', v.applicantContact);
    fd.append('vehicleNumber', v.vehicleNumber);
    fd.append('vehicleSegment', v.vehicleSegment);
    fd.append('valuationId', this.valuationId);

    if (this.rcFile) {
      fd.append('rcFile', this.rcFile, this.rcFile.name);
    }
    if (this.insuranceFile) {
      fd.append('insuranceFile', this.insuranceFile, this.insuranceFile.name);
    }
    this.otherFiles.forEach(f => fd.append('otherFiles', f, f.name));

    return fd;
  }

  // "Save" (draft) flow
  onSave() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.saveInProgress = true;

    const payload = this.buildFormData();
    
    // First update stakeholder
    this.svc.updateStakeholder(
      this.valuationId,
      this.vehicleNumber, 
      this.applicantContact,
      payload
    ).pipe(
      // After successful update, start workflow
      switchMap(() => this.workflowSvc.startWorkflow(this.valuationId, 1,this.vehicleNumber, encodeURIComponent(this.applicantContact)))
    ).subscribe({
      next: (): void => {
        this.saveInProgress = false;
        this.saving = false;
        // Optionally show a snack/toast here
      },
      error: (err: { message?: string }): void => {
        this.error = err.message || 'Save failed';
        this.saveInProgress = false; 
        this.saving = false;
      }
    });
  }

  // "Submit" flow
  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.submitInProgress = true;

    const payload = this.buildFormData();
    this.svc.updateStakeholder(
      this.valuationId,
      this.vehicleNumber,
      this.applicantContact,
      payload
    ).pipe(
      // Complete workflow with step 1
      switchMap(() => this.workflowSvc.completeWorkflow(this.valuationId, 1,this.vehicleNumber, encodeURIComponent(this.applicantContact))),
      // Start workflow with step 2
      switchMap(() => this.workflowSvc.startWorkflow(this.valuationId, 2,this.vehicleNumber, encodeURIComponent(this.applicantContact))),
      // Finally, update vehicle valuation details
      switchMap(() => this.valuationSvc.getValuationDetailsfromAttesterApi(this.valuationId, this.vehicleNumber, this.applicantContact))
    ).subscribe({
      next: () => {
      // after submit, navigate back to View
      this.router.navigate(
      ['/valuations', this.valuationId, 'stakeholder'],
      {
        queryParams: {
          vehicleNumber: this.vehicleNumber,
          applicantContact: this.applicantContact
        }
      }
    );
      },
      error: err => {
      this.error = err.message || 'Submit failed';
      this.submitInProgress = false;
      this.saving = false;
      }
    });
    }

  onCancel() {
    this.router.navigate(
      ['/valuations', this.valuationId, 'stakeholder'],
      {
        queryParams: {
          vehicleNumber: this.vehicleNumber,
          applicantContact: this.applicantContact
        }
      }
    );
  }
}

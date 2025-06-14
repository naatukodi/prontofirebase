import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router }   from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StakeholderService } from '../../../services/stakeholder.service';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { WorkflowService } from '../../../services/workflow.service';
import { ValuationService } from '../../../services/valuation.service'; // Import if needed for other services
import { v4 as uuidv4 } from 'uuid';
import { SharedModule } from '../../shared/shared.module/shared.module';
import { WorkflowButtonsComponent } from '../../workflow-buttons/workflow-buttons.component';
import { RouterModule, Routes } from '@angular/router';


@Component({
  selector: 'app-stakeholder-new',
  imports: [SharedModule, WorkflowButtonsComponent, RouterModule],
  standalone: true,
  templateUrl: './stakeholder-new.component.html',
  styleUrls: ['./stakeholder-new.component.scss']
})
export class StakeholderNewComponent implements OnInit {
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

  // There is no built-in JavaScript or Angular function for generating GUIDs/UUIDs like vvid.
  // The most standard way is to use a library like 'uuid' (https://www.npmjs.com/package/uuid).
  // If you want to use that, first install it: npm install uuid


  ngOnInit(): void {
    // Use uuidv4() to generate a new GUID if not present in query params
    this.valuationId = this.route.snapshot.queryParamMap.get('valuationId') || uuidv4();
    this.vehicleNumber = this.route.snapshot.queryParamMap.get('vehicleNumber')!;
    this.applicantContact = this.route.snapshot.queryParamMap.get('applicantContact')!;
    this.initForm();
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
    const vehicleNumber = this.form.get('vehicleNumber')?.value;
    const applicantContact = this.form.get('applicantContact')?.value;

    // First create stakeholder
    this.svc.newStakeholder(
      this.valuationId,
      vehicleNumber, 
      applicantContact,
      payload
    ).pipe(
      // After successful creation, start workflow
      switchMap(() => this.workflowSvc.startWorkflow(this.valuationId, 1, vehicleNumber, encodeURIComponent(applicantContact)))
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
    const vehicleNumber = this.form.get('vehicleNumber')?.value;
    const applicantContact = this.form.get('applicantContact')?.value;

    this.svc.updateStakeholder(
      this.valuationId,
      vehicleNumber,
      applicantContact,
      payload
    ).pipe(
      // Complete workflow with step 1
      switchMap(() => this.workflowSvc.completeWorkflow(this.valuationId, 1, vehicleNumber, encodeURIComponent(applicantContact))),
      // Start workflow with step 2
      switchMap(() => this.workflowSvc.startWorkflow(this.valuationId, 2, vehicleNumber, encodeURIComponent(applicantContact))),
      // Finally, update vehicle valuation details
      switchMap(() => this.valuationSvc.getValuationDetailsfromAttesterApi(this.valuationId, vehicleNumber, applicantContact))
    ).subscribe({
      next: () => {
      // after submit, navigate back to View
      this.router.navigate(
        ['/valuations', this.valuationId, 'stakeholder'],
        {
        queryParams: {
          vehicleNumber: vehicleNumber,
          applicantContact: applicantContact
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


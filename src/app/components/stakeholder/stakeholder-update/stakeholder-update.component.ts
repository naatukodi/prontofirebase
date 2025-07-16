// stakeholder-update.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';

import {
  PincodeService,
  PincodeModel
} from '../../../services/pincode.service';
import { StakeholderService } from '../../../services/stakeholder.service';
import { WorkflowService } from '../../../services/workflow.service';
import { ValuationService } from '../../../services/valuation.service';
import { SharedModule } from '../../shared/shared.module/shared.module';
import { RouterModule } from '@angular/router';
import { WorkflowButtonsComponent } from '../../workflow-buttons/workflow-buttons.component';

@Component({
  selector: 'app-stakeholder-update',
  standalone: true,
  imports: [SharedModule, RouterModule, WorkflowButtonsComponent],
  templateUrl: './stakeholder-update.component.html',
  styleUrls: ['./stakeholder-update.component.scss']
})
export class StakeholderUpdateComponent implements OnInit {
  loading = false;
  form!: FormGroup;
  valuationId!: string;
  vehicleNumber!: string;
  applicantContact!: string;
  valuationType!: string;

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
  locationOptions: PincodeModel[] = [];

  saving = false;
  saveInProgress = false;
  submitInProgress = false;
  error: string | null = null;
  saved = false;

  rcFile?: File;
  insuranceFile?: File;
  otherFiles: File[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private pincodeSvc: PincodeService,
    private svc: StakeholderService,
    private workflowSvc: WorkflowService,
    private valuationSvc: ValuationService
  ) {}

  ngOnInit(): void {
    this.valuationId = this.route.snapshot.paramMap.get('valuationId')!;
    this.route.queryParamMap.subscribe(params => {
      this.vehicleNumber = params.get('vehicleNumber')!;
      this.applicantContact = params.get('applicantContact')!;
      this.valuationType = params.get('valuationType')!;
      this.initForm();
      this.loadStakeholder();
    });
  }

  private initForm() {
    this.form = this.fb.group({
      pincode: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
      stakeholderName: ['', Validators.required],
      stakeholderExecutiveName: ['', Validators.required],
      stakeholderExecutiveContact: ['', [Validators.pattern(/^[0-9]{10}$/)]],
      stakeholderExecutiveWhatsapp: [''],
      stakeholderExecutiveEmail: ['', [Validators.email]],
      valuationType: [''],
      location: ['', Validators.required],
      block: [{ value: '', disabled: true }],
      district: [{ value: '', disabled: true }],
      division: [{ value: '', disabled: true }],
      state: [{ value: '', disabled: true }],
      country: [{ value: '', disabled: true }],
      applicantName: ['', Validators.required],
      applicantContact: ['', [Validators.pattern(/^[0-9]{10}$/)]],
      vehicleNumber: ['', Validators.required],
      vehicleSegment: ['', Validators.required]
    });
  }

  onPincodeLookup() {
    const pin = this.form.get('pincode')!.value;
    if (!this.form.get('pincode')!.valid) {
      this.locationOptions = [];
      return;
    }
    this.pincodeSvc.lookup(pin).subscribe({
      next: offices => {
        this.locationOptions = offices;
        this.form.patchValue({ location: '', block: '', district: '', division: '', state: '', country: '' });
      },
      error: () => {
        this.error = 'PIN lookup failed';
        this.locationOptions = [];
      }
    });
  }

  onLocationChange(selected: PincodeModel) {
    this.form.patchValue({
      block: selected.block,
      district: selected.district,
      division: selected.division,
      state: selected.state,
      country: selected.country
    });
  }

  onFileChange(event: Event, field: 'rcFile' | 'insuranceFile') {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this[field] = input.files[0];
  }

  onMultiFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.otherFiles = input.files ? Array.from(input.files) : [];
  }

  private buildFormData(): FormData {
    const fd = new FormData();
    const v = this.form.getRawValue();

    fd.append('pincode', v.pincode);
    fd.append('locationName', v.location.name);
    fd.append('block', v.block);
    fd.append('district', v.district);
    fd.append('division', v.division);
    fd.append('state', v.state);
    fd.append('country', v.country);

    fd.append('name', v.stakeholderName);
    fd.append('executiveName', v.stakeholderExecutiveName);
    fd.append('executiveContact', v.stakeholderExecutiveContact);
    fd.append('executiveWhatsapp', v.stakeholderExecutiveWhatsapp || '');
    fd.append('executiveEmail', v.stakeholderExecutiveEmail || '');
    fd.append('valuationType', v.valuationType);

    fd.append('applicantName', v.applicantName);
    fd.append('applicantContact', v.applicantContact);
    fd.append('vehicleNumber', v.vehicleNumber);
    fd.append('vehicleSegment', v.vehicleSegment);
    fd.append('valuationId', this.valuationId);

    if (this.rcFile) fd.append('RcFile', this.rcFile, this.rcFile.name);
    if (this.insuranceFile) fd.append('InsuranceFile', this.insuranceFile, this.insuranceFile.name);
    this.otherFiles.forEach(f => fd.append('OtherFiles', f, f.name));

    return fd;
  }

  private loadStakeholder() {
    this.svc.getStakeholder(this.valuationId, this.vehicleNumber, this.applicantContact)
      .subscribe({
        next: data => {
          this.form.patchValue({
            pincode: data.vehicleLocation.pincode,
            location: data.vehicleLocation,
            block: data.vehicleLocation.block,
            district: data.vehicleLocation.district,
            division: data.vehicleLocation.division,
            state: data.vehicleLocation.state,
            country: data.vehicleLocation.country,

            stakeholderName: data.name,
            stakeholderExecutiveName: data.executiveName,
            stakeholderExecutiveContact: data.executiveContact,
            stakeholderExecutiveWhatsapp: data.executiveWhatsapp,
            stakeholderExecutiveEmail: data.executiveEmail,
            valuationType: data.valuationType,

            applicantName: data.applicant.name,
            applicantContact: data.applicant.contact,

            vehicleNumber: this.vehicleNumber,
            vehicleSegment: data.vehicleSegment
          });
          this.saving = this.loading = false;
        },
        error: err => {
          this.error = err.message || 'Failed to load';
          this.loading = false;
        }
      });
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
      ,
      switchMap(() =>
        this.workflowSvc.updateWorkflowTable(
          this.valuationId,
          this.vehicleNumber,
          this.applicantContact,
          'Stakeholder',
          1
        )
      )
    ).subscribe({
      next: (): void => {
        this.saving = this.saveInProgress = false;
        this.saved = true;
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
      ,
      switchMap(() =>
        this.workflowSvc.updateWorkflowTable(
          this.valuationId,
          this.vehicleNumber,
          this.applicantContact,
          'BackEnd',
          2
        )
      )
    ).subscribe({
      next: () => {
      // after submit, navigate back to View
      this.router.navigate(
      ['/valuation', this.valuationId, 'stakeholder'],
      {
        queryParams: {
          vehicleNumber: this.vehicleNumber,
          applicantContact: this.applicantContact,
          valuationType: this.valuationType
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
      ['/valuation', this.valuationId, 'stakeholder'],
      {
        queryParams: {
          vehicleNumber: this.vehicleNumber,
          applicantContact: this.applicantContact,
          valuationType: this.valuationType
        }
      }
    );
  }
}

import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

import { StakeholderService } from '../../../services/stakeholder.service';
import { WorkflowService }    from '../../../services/workflow.service';
import { ValuationService }   from '../../../services/valuation.service';
import { SharedModule } from '../../shared/shared.module/shared.module';
import { RouterModule } from '@angular/router';
import {
  PincodeService,
  PincodeModel
} from '../../../services/pincode.service';

@Component({
  selector: 'app-stakeholder-new',
  standalone: true,
  imports: [SharedModule, RouterModule],
  templateUrl: './stakeholder-new.component.html',
  styleUrls: ['./stakeholder-new.component.scss']
})
export class StakeholderNewComponent implements OnInit {
  form!: FormGroup;
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
  locationOptions: PincodeModel[] = [];

  saving = false;
  saveInProgress = false;
  submitInProgress = false;
  error: string | null = null;

  rcFile?: File;
  insuranceFile?: File;
  otherFiles: File[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private svc: StakeholderService,
    private workflowSvc: WorkflowService,
    private valuationSvc: ValuationService,
    private pincodeSvc: PincodeService
  ) {}

  ngOnInit(): void {
    this.valuationId =
      this.route.snapshot.queryParamMap.get('valuationId') ||
      uuidv4();
    this.vehicleNumber =
      this.route.snapshot.queryParamMap.get('vehicleNumber')!;
    this.applicantContact =
      this.route.snapshot.queryParamMap.get('applicantContact')!;

    this.form = this.fb.group({
      pincode: [
        '',
        [Validators.required, Validators.pattern(/^[0-9]{6}$/)]
      ],
      stakeholderName: ['', Validators.required],
      stakeholderExecutiveName: ['', Validators.required],
      stakeholderExecutiveContact: [
        '',
        [Validators.pattern(/^[0-9]{10}$/)]
      ],
      stakeholderExecutiveWhatsapp: [''],
      stakeholderExecutiveEmail: ['', [Validators.email]],
      valuationType: [''],

      location: ['', Validators.required],
      block:    [{ value: '', disabled: true }],
      district:[{ value: '', disabled: true }],
      division:[{ value: '', disabled: true }],
      state:    [{ value: '', disabled: true }],
      country:  [{ value: '', disabled: true }],

      applicantName:   ['', Validators.required],
      applicantContact:['', Validators.required],
      vehicleNumber:   ['', Validators.required],
      vehicleSegment:  ['', Validators.required]
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
        // clear old auto-fields
        this.form.patchValue({
          location: '', block: '', district: '',
          division: '', state: '', country: ''
        });
      },
      error: () => {
        this.error = 'PIN lookup failed';
        this.locationOptions = [];
      }
    });
  }

  onLocationChange(selected: PincodeModel) {
    // assuming your PincodeModel now has `district` and `division`
    this.form.patchValue({
      block:    selected.block,
      district: selected.district,
      division: selected.division,
      state:    selected.state,
      country:  selected.country
    });
  }

  onFileChange(
    event: Event,
    field: 'rcFile' | 'insuranceFile'
  ) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this[field] = input.files[0];
    }
  }

  onMultiFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.otherFiles = input.files
      ? Array.from(input.files)
      : [];
  }

  private buildFormData(): FormData {
    const fd = new FormData();
    const v = this.form.getRawValue();

    fd.append('pincode',        v.pincode);
    fd.append('locationName',   v.location.name);
    fd.append('block',          v.block);
    fd.append('district',       v.district);
    fd.append('division',       v.division);
    fd.append('state',          v.state);
    fd.append('country',        v.country);

    fd.append('name',           v.stakeholderName);
    fd.append('executiveName',  v.stakeholderExecutiveName);
    fd.append('executiveContact',  v.stakeholderExecutiveContact);
    fd.append('executiveWhatsapp', v.stakeholderExecutiveWhatsapp || '');
    fd.append('executiveEmail',    v.stakeholderExecutiveEmail || '');
    fd.append('valuationType',     v.valuationType);

    fd.append('applicantName',   v.applicantName);
    fd.append('applicantContact',v.applicantContact);
    fd.append('vehicleNumber',   v.vehicleNumber);
    fd.append('vehicleSegment',  v.vehicleSegment);
    fd.append('valuationId',     this.valuationId);

    if (this.rcFile)
      fd.append('RcFile', this.rcFile, this.rcFile.name);
    if (this.insuranceFile)
      fd.append('InsuranceFile', this.insuranceFile, this.insuranceFile.name);
    this.otherFiles.forEach(f =>
      fd.append('OtherFiles', f, f.name)
    );

    return fd;
  }

  onSave() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = this.saveInProgress = true;
    const payload = this.buildFormData();

    this.svc
      .updateStakeholder(
        this.valuationId,
        this.vehicleNumber,
        this.applicantContact,
        payload
      )
      .pipe(
        switchMap(() =>
          this.workflowSvc.startWorkflow(
            this.valuationId,
            1,
            this.vehicleNumber,
            encodeURIComponent(this.applicantContact)
          )
        )
      )
      .subscribe({
        next: () => (this.saving = this.saveInProgress = false),
        error: e => {
          this.error = e.message;
          this.saving = this.saveInProgress = false;
        }
      });
  }

  onSubmit() {
     if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = this.submitInProgress = true;
    const payload = this.buildFormData();
    const vn = this.form.get('vehicleNumber')!.value;
    const ac = this.form.get('applicantContact')!.value;

    this.svc
      .updateStakeholder(
        this.valuationId,
        vn,
        ac,
        payload
      )
      .pipe(
        switchMap(() =>
          this.workflowSvc.completeWorkflow(
            this.valuationId,
            1,
            vn,
            encodeURIComponent(ac)
          )
        ),
        switchMap(() =>
          this.workflowSvc.startWorkflow(
            this.valuationId,
            2,
            vn,
            encodeURIComponent(ac)
          )
        ),
        switchMap(() =>
          this.valuationSvc.getValuationDetailsfromAttesterApi(
            this.valuationId,
            vn,
            ac
          )
        )
      )
      .subscribe({
        next: () => {
          this.router.navigate(
            [
              '/valuations',
              this.valuationId,
              'stakeholder'
            ],
            {
              queryParams: { vehicleNumber: vn, applicantContact: ac }
            }
          );
        },
        error: err => {
          this.error = err.message || 'Submit failed';
          this.submitInProgress = this.saving = false;
        }
      });  }

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

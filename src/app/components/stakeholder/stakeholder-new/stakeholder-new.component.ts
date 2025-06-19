import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { share, switchMap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { SharedModule } from '../../shared/shared.module/shared.module';
import { RouterModule } from '@angular/router';
import { WorkflowButtonsComponent } from '../../workflow-buttons/workflow-buttons.component';

import { StakeholderService } from '../../../services/stakeholder.service';
import { WorkflowService }    from '../../../services/workflow.service';
import { ValuationService }   from '../../../services/valuation.service';
import {
  PincodeService,
  PincodeModel
} from '../../../services/pincode.service';

@Component({
  selector: 'app-stakeholder-new',
  standalone: true,
  imports: [ SharedModule, RouterModule, WorkflowButtonsComponent ],
  templateUrl: './stakeholder-new.component.html',
  styleUrls: ['./stakeholder-new.component.scss']
})
export class StakeholderNewComponent implements OnInit {
  form!: FormGroup;

  valuationId!: string;
  vehicleNumber!: string;
  applicantContact!: string;

  stakeholderOptions = [
    'State Bank of India (SBI)',
    'HDFC Bank',
    'ICICI Bank',
    // …rest of your list…
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
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
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
        [Validators.pattern('^[0-9]{10}$')]
      ],
      stakeholderExecutiveWhatsapp: [''],
      stakeholderExecutiveEmail: ['', [Validators.email]],
      valuationType: [''],
      location: ['', Validators.required],
      block: [{ value: '', disabled: true }],
      state: [{ value: '', disabled: true }],
      country: [{ value: '', disabled: true }],
      applicantName: ['', Validators.required],
      applicantContact: [
        this.applicantContact,
        Validators.required
      ],
      vehicleNumber: ['', Validators.required],
      vehicleSegment: ['', Validators.required]
    });
  }

  onPincodeLookup() {
    const pin = this.form.get('pincode')!.value;
    if (this.form.get('pincode')!.valid) {
      this.pincodeSvc.lookup(pin).subscribe({
        next: offices => {
          this.locationOptions = offices;
          // clear previous selection
          this.form.patchValue({
            location: '',
            block: '',
            state: '',
            country: ''
          });
        },
        error: () => {
          this.locationOptions = [];
          this.error = 'Failed to lookup PIN code';
        }
      });
    } else {
      this.locationOptions = [];
    }
  }

  onLocationChange(selected: PincodeModel) {
    this.form.patchValue({
      block: selected.block,
      state: selected.state,
      country: selected.country
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

    fd.append('pincode', v.pincode);
    fd.append('locationName', v.location.name);
    fd.append('block', v.block);
    fd.append('state', v.state);
    fd.append('country', v.country);

    fd.append('name', v.stakeholderName);
    fd.append('executiveName', v.stakeholderExecutiveName);
    fd.append(
      'executiveContact',
      v.stakeholderExecutiveContact
    );
    fd.append(
      'executiveWhatsapp',
      v.stakeholderExecutiveWhatsapp || ''
    );
    fd.append(
      'executiveEmail',
      v.stakeholderExecutiveEmail || ''
    );
    fd.append('valuationType', v.valuationType);

    fd.append('applicantName', v.applicantName);
    fd.append('applicantContact', v.applicantContact);
    fd.append('vehicleNumber', v.vehicleNumber);
    fd.append('vehicleSegment', v.vehicleSegment);
    fd.append('valuationId', this.valuationId);

    if (this.rcFile) {
      fd.append('rcFile', this.rcFile, this.rcFile.name);
    }
    if (this.insuranceFile) {
      fd.append(
        'insuranceFile',
        this.insuranceFile,
        this.insuranceFile.name
      );
    }
    this.otherFiles.forEach(f =>
      fd.append('otherFiles', f, f.name)
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
    const vn = this.form.get('vehicleNumber')!.value;
    const ac = this.form.get('applicantContact')!.value;

    this.svc
      .newStakeholder(
        this.valuationId,
        vn,
        ac,
        payload
      )
      .pipe(
        switchMap(() =>
          this.workflowSvc.startWorkflow(
            this.valuationId,
            1,
            vn,
            encodeURIComponent(ac)
          )
        )
      )
      .subscribe({
        next: () => {
          this.saveInProgress = this.saving = false;
        },
        error: err => {
          this.error = err.message || 'Save failed';
          this.saveInProgress = this.saving = false;
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
      });
  }

  onCancel() {
    this.router.navigate(
      [
        '/valuations',
        this.valuationId,
        'stakeholder'
      ],
      {
        queryParams: {
          vehicleNumber: this.vehicleNumber,
          applicantContact: this.applicantContact
        }
      }
    );
  }
}

// src/app/components/stakeholder/stakeholder-new/stakeholder-new.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { StakeholderService } from '../../../services/stakeholder.service';
import { WorkflowService }    from '../../../services/workflow.service';
import { ValuationService }   from '../../../services/valuation.service';
import { HistoryLoggerService } from '../../../services/history-logger.service';
import {
  PincodeService,
  PincodeModel
} from '../../../services/pincode.service';
import { SharedModule } from '../../shared/shared.module/shared.module';
import { RouterModule } from '@angular/router';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { VehicleDuplicateCheckResponse } from '../../../models/vehicle-duplicate-check.interface';

@Component({
  selector: 'app-stakeholder-new',
  standalone: true,
  imports: [SharedModule, RouterModule, MatCheckboxModule, ReactiveFormsModule],
  templateUrl: './stakeholder-new.component.html',
  styleUrls: ['./stakeholder-new.component.scss']
})
export class StakeholderNewComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  valuationId!: string;
  vehicleNumber!: string;
  applicantContact!: string;

  private valueSubscriptions = new Subscription();

  duplicateInfo: VehicleDuplicateCheckResponse = {
    isDuplicate: false,
    isVehicleNumberExists: false,
    isEngineNumberExists: false,
    isChassisNumberExists: false,
    totalDuplicatesFound: 0,
    existingRecords: [],
    messages: []
  };
  
  isCheckingDuplicate = false;
  showDuplicateWarning = false;

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
    private svc: StakeholderService,
    private workflowSvc: WorkflowService,
    private valuationSvc: ValuationService,
    private pincodeSvc: PincodeService,
    private historyLogger: HistoryLoggerService
  ) {}

  ngOnInit(): void {
    this.valuationId =
      this.route.snapshot.queryParamMap.get('valuationId') ||
      uuidv4();
    this.vehicleNumber =
      this.route.snapshot.queryParamMap.get('vehicleNumber') || '';
    this.applicantContact =
      this.route.snapshot.queryParamMap.get('applicantContact') || '';

    this.form = this.fb.group({
      pincode: [
        '',
        [Validators.required, Validators.pattern(/^[0-9]{6}$/)]
      ],
      stakeholderName:            ['', Validators.required],
      stakeholderExecutiveName:   ['', Validators.required],
      stakeholderExecutiveContact:['',Validators.required, Validators.pattern(/^[0-9]{10}$/)],
      stakeholderExecutiveWhatsapp:['', Validators.pattern(/^[0-9]{10}$/)],
      sameAsContact: [false],
      stakeholderExecutiveEmail:  ['', Validators.email],
      valuationType: ['', Validators.required],
      location:  [null as PincodeModel|null, Validators.required],
      block:     [''],
      district:  [''],
      division:  [''],
      state:     [''],
      country:   [''],
      applicantName:    ['', Validators.required],
      applicantContact: ['',Validators.required, Validators.pattern(/^[0-9]{10}$/)],
      vehicleNumber:   [
        '',
        [
          Validators.required,
          Validators.pattern(/^[a-zA-Z0-9]+$/)
        ]
      ],
      vehicleSegment:  [''],
      remarks: ['']
    });

    this.setupWhatsappAutofill();
    this.setupDuplicateCheck();
  }

  ngOnDestroy(): void {
    this.valueSubscriptions.unsubscribe();
  }

  setupWhatsappAutofill(): void {
    const contactControl = this.form.get('stakeholderExecutiveContact');
    const whatsappControl = this.form.get('stakeholderExecutiveWhatsapp');
    const checkboxControl = this.form.get('sameAsContact');

    if (!contactControl || !whatsappControl || !checkboxControl) {
      return;
    }

    const checkboxSub = checkboxControl.valueChanges.subscribe(isChecked => {
      if (isChecked) {
        whatsappControl.setValue(contactControl.value);
        whatsappControl.disable();
      } else {
        whatsappControl.enable();
      }
    });

    const contactSub = contactControl.valueChanges.subscribe(newContactValue => {
      if (checkboxControl.value) {
        whatsappControl.setValue(newContactValue);
      }
    });

    this.valueSubscriptions.add(checkboxSub);
    this.valueSubscriptions.add(contactSub);
  }

  setupDuplicateCheck(): void {
    const vehicleNumberControl = this.form.get('vehicleNumber');
    
    if (!vehicleNumberControl) return;

    const duplicateCheckSub = vehicleNumberControl.valueChanges
      .pipe(
        debounceTime(1000),
        distinctUntilChanged()
      )
      .subscribe(vehicleNumber => {
        if (vehicleNumber && vehicleNumber.length >= 4) {
          this.checkForDuplicates(vehicleNumber);
        } else {
          this.resetDuplicateInfo();
        }
      });

    this.valueSubscriptions.add(duplicateCheckSub);
  }

  checkForDuplicates(vehicleNumber: string): void {
    this.isCheckingDuplicate = true;
    
    this.valuationSvc.checkDuplicateVehicle(vehicleNumber, undefined, undefined)
      .subscribe({
        next: (response) => {
          this.isCheckingDuplicate = false;
          this.handleDuplicateResponse(response);
        },
        error: (error) => {
          this.isCheckingDuplicate = false;
          console.error('Error checking duplicates:', error);
        }
      });
  }

  handleDuplicateResponse(response: VehicleDuplicateCheckResponse): void {
    this.duplicateInfo = response;
    this.showDuplicateWarning = response.isDuplicate;

    if (response.isDuplicate) {
      console.log('⚠️ Duplicate vehicle detected!');
      console.log('Messages:', response.messages);
      console.log('Existing records:', response.existingRecords);
    }
  }

  resetDuplicateInfo(): void {
    this.duplicateInfo = {
      isDuplicate: false,
      isVehicleNumberExists: false,
      isEngineNumberExists: false,
      isChassisNumberExists: false,
      totalDuplicatesFound: 0,
      existingRecords: [],
      messages: []
    };
    this.showDuplicateWarning = false;
  }

  dismissWarning(): void {
    this.showDuplicateWarning = false;
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
        this.form.patchValue({
          location: null as unknown as PincodeModel | null,
          block: '',
          district: '',
          division: '',
          state: '',
          country: ''
        });
      },
      error: () => {
        this.error = 'PIN lookup failed';
        this.locationOptions = [];
      }
    });
  }

  onLocationChange(selected: PincodeModel) {
    this.form.patchValue({
      location: selected,
      block:    selected.block,
      district: selected.district,
      division: selected.division,
      state:    selected.state,
      country:  selected.country
    });
  }

  compareByName(a: PincodeModel, b: PincodeModel) {
    return a && b ? a.name === b.name : a === b;
  }

  onFileChange(event: Event, field: 'rcFile' | 'insuranceFile'): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      if (field === 'rcFile') {
        this.rcFile = input.files[0];
      } else if (field === 'insuranceFile') {
        this.insuranceFile = input.files[0];
      }
    }
  }

  onMultiFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.otherFiles = Array.from(input.files);
    }
  }

  private buildFormData(): FormData {
    const fd = new FormData();
    const v = this.form.getRawValue();

    Object.entries({
      pincode: v.pincode,
      locationName: v.location!.name,
      block: v.block,
      district: v.district,
      division: v.division,
      state: v.state,
      country: v.country,
      name: v.stakeholderName,
      executiveName: v.stakeholderExecutiveName,
      executiveContact: v.stakeholderExecutiveContact,
      executiveWhatsapp: v.stakeholderExecutiveWhatsapp || '',
      executiveEmail: v.stakeholderExecutiveEmail || '',
      valuationType: v.valuationType,
      applicantName: v.applicantName,
      applicantContact: v.applicantContact,
      vehicleNumber: v.vehicleNumber,
      vehicleSegment: v.vehicleSegment,
      valuationId: this.valuationId,
      Remarks: v.remarks || ''
    }).forEach(([k, val]) => {
      fd.append(k, val as string);
    });

    if (this.rcFile) {
      fd.append('RcFile', this.rcFile, this.rcFile.name);
    }
    if (this.insuranceFile) {
      fd.append('InsuranceFile', this.insuranceFile, this.insuranceFile.name);
    }
    this.otherFiles.forEach(file =>
      fd.append('OtherFiles', file, file.name)
    );

    return fd;
  }

  onSave() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = this.saveInProgress = true;
    this.svc
      .updateStakeholder(
        this.valuationId,
        this.vehicleNumber,
        this.applicantContact,
        this.buildFormData()
      )
      .pipe(
        switchMap(() =>
          this.workflowSvc.startWorkflow(
            this.valuationId,
            1,
            this.vehicleNumber,
            encodeURIComponent(this.applicantContact)
          )
        ),
        switchMap(() =>
          this.workflowSvc.updateWorkflowTable(
            this.valuationId,
            this.vehicleNumber,
            this.applicantContact,
            {
              workflow: 'Stakeholder',
              workflowStepOrder: 1
            }
          )
        ),
        switchMap(async () => {
          await this.historyLogger.logAction(
            this.valuationId,
            'Stakeholder Saved',
            'New stakeholder details have been saved'
          );
          return of(null);
        })
      )
      .subscribe({
        next: () => (this.saving = this.saveInProgress = false),
        error: e => {
          this.error = e.message;
          this.saving = this.saveInProgress = false;
          this.saved = true;
        }
      });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.duplicateInfo.isDuplicate) {
      const confirmMessage = 
        '⚠️ DUPLICATE VEHICLE DETECTED!\n\n' +
        this.duplicateInfo.messages.join('\n') +
        '\n\nFound ' + this.duplicateInfo.totalDuplicatesFound + ' existing record(s).\n\n' +
        'Do you want to proceed anyway?';

      if (!confirm(confirmMessage)) {
        return;
      }
    }

    this.saving = this.submitInProgress = true;
    const payload = this.buildFormData();
    const vn = this.form.get('vehicleNumber')!.value;
    const ac = this.form.get('applicantContact')!.value;

    this.svc
      .updateStakeholder(this.valuationId, vn, ac, payload)
      .pipe(
        switchMap(() =>
          this.workflowSvc.startWorkflow(
            this.valuationId,
            1,
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
        ),
        switchMap(() =>
          this.workflowSvc.updateWorkflowTable(
            this.valuationId,
            vn,
            ac,
            {
              workflow: 'Stakeholder',
              workflowStepOrder: 1
            }
          )
        ),
        switchMap(async () => {
          await this.historyLogger.logAction(
            this.valuationId,
            'Stakeholder Submitted',
            'Stakeholder details submitted for next step',
            'unknown',
            'Unknown User',
            'In Progress',
            'Stakeholder Complete'
          );
          return of(null);
        })
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/valuations', this.valuationId, 'stakeholder'], {
            queryParams: { vehicleNumber: vn, applicantContact: ac }
          });
        },
        error: err => {
          this.error = err.message || 'Submit failed';
          this.saving = this.submitInProgress = this.saving = false;
        }
      });
  }

  onCancel() {
    this.router.navigate(['/valuations', this.valuationId, 'stakeholder'], {
      queryParams: {
        vehicleNumber: this.vehicleNumber,
        applicantContact: this.applicantContact
      }
    });
  }
}

// src/app/components/stakeholder/stakeholder-update/stakeholder-update.component.ts

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Observable, Subscription } from 'rxjs';
import { switchMap, map, take } from 'rxjs/operators';

import {
  PincodeService,
  PincodeModel
} from '../../../services/pincode.service';
import { StakeholderService } from '../../../services/stakeholder.service';
import { WorkflowService } from '../../../services/workflow.service';
import { ValuationService } from '../../../services/valuation.service';
import { HistoryLoggerService } from '../../../services/history-logger.service';
import { SharedModule } from '../../shared/shared.module/shared.module';
import { RouterModule } from '@angular/router';
import { WorkflowButtonsComponent } from '../../workflow-buttons/workflow-buttons.component';
import { Auth, User, authState } from '@angular/fire/auth';
import { UsersService } from '../../../services/users.service';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-stakeholder-update',
  standalone: true,
  imports: [SharedModule, RouterModule, WorkflowButtonsComponent, ReactiveFormsModule, MatCheckboxModule],
  templateUrl: './stakeholder-update.component.html',
  styleUrls: ['./stakeholder-update.component.scss']
})
export class StakeholderUpdateComponent implements OnInit, OnDestroy {
  loading = false;
  form!: FormGroup;
  valuationId!: string;
  vehicleNumber!: string;
  applicantContact!: string;
  valuationType!: string;

  private valueSubscriptions = new Subscription();
  private usersSvc = inject(UsersService);

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

  private assignedTo: string = '';
  private assignedToPhoneNumber: string = '';
  private assignedToEmail: string = '';
  private assignedToWhatsapp: string = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private pincodeSvc: PincodeService,
    private svc: StakeholderService,
    private workflowSvc: WorkflowService,
    private valuationSvc: ValuationService,
    private historyLogger: HistoryLoggerService,
    private auth: Auth
  ) {}

  ngOnInit(): void {
    this.valuationId = this.route.snapshot.paramMap.get('valuationId')!;
    this.route.queryParamMap.subscribe(params => {
      this.vehicleNumber = params.get('vehicleNumber')!;
      this.applicantContact = params.get('applicantContact')!;
      this.valuationType = params.get('valuationType')!;
      this.initForm();
      this.loadStakeholder();
      this.setupWhatsappAutofill();
      authState(this.auth).pipe(take(1)).subscribe(u => this.applyAssignedFromUser(u));
    });
  }

  ngOnDestroy(): void {
    this.valueSubscriptions.unsubscribe();
  }

  private initForm() {
    this.form = this.fb.group({
      pincode: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
      stakeholderName: ['', Validators.required],
      stakeholderExecutiveName: ['', Validators.required],
      stakeholderExecutiveContact: ['', [Validators.pattern(/^[0-9]{10}$/)]],
      stakeholderExecutiveWhatsapp: ['', [Validators.pattern(/^[0-9]{10}$/)]],
      sameAsContact: [false],
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
      vehicleSegment: ['', Validators.required],
      remarks: ['']
    });
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

  private resolveDisplayName(u: User | null): Observable<string> {
    return of(u).pipe(
      switchMap(user => {
        if (!user) return of('');
        const id = this.resolveId(user);
        if (!id) return of(this.fallbackName(user));
        return this.usersSvc.getById(id).pipe(
          map(m => (m?.name?.trim() || this.fallbackName(user)))
        );
      })
    );
  }

  private resolveId(u: User): string | null {
    return u.phoneNumber ?? u.uid ?? u.email ?? null;
  }

  private fallbackName(u: User): string {
    return u.displayName || u.email || u.phoneNumber || '';
  }

  private applyAssignedFromUser(u: User | null): void {
    this.resolveDisplayName(u).pipe(take(1)).subscribe(name => {
      const safeName =
        (name?.trim() || '') ||
        (u?.email ? u.email.split('@')[0] : '') ||
        (u?.phoneNumber || '') ||
        'User';

      this.assignedTo = safeName;
      this.assignedToPhoneNumber = u?.phoneNumber || '';
      this.assignedToEmail = u?.email || '';
      this.assignedToWhatsapp = u?.phoneNumber || '';
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
    fd.append('AssignedTo', this.assignedTo);
    fd.append('AssignedToPhoneNumber', this.assignedToPhoneNumber);
    fd.append('AssignedToEmail', this.assignedToEmail);
    fd.append('AssignedToWhatsapp', this.assignedToWhatsapp);
    fd.append('remarks', v.remarks || '');

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
            vehicleSegment: data.vehicleSegment,
            remarks: data.remarks ?? ''
          });
          this.saving = this.loading = false;
          if (data.executiveContact && data.executiveContact === data.executiveWhatsapp) {
            this.form.get('sameAsContact')?.setValue(true);
          }
        },
        error: err => {
          this.error = err.message || 'Failed to load';
          this.loading = false;
        }
      });
  }

  onSave() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.saveInProgress = true;

    const payload = this.buildFormData();
    
    this.svc.updateStakeholder(
      this.valuationId,
      this.vehicleNumber, 
      this.applicantContact,
      payload
    ).pipe(
      switchMap(() => this.workflowSvc.startWorkflow(this.valuationId, 1, this.vehicleNumber, encodeURIComponent(this.applicantContact))),
      switchMap(() =>
        this.workflowSvc.updateWorkflowTable(
          this.valuationId,
          this.vehicleNumber,
          this.applicantContact,
          {
            workflow: 'Stakeholder',
            workflowStepOrder: 1,
            assignedTo: this.assignedTo,
            assignedToPhoneNumber: this.assignedToPhoneNumber,
            assignedToEmail: this.assignedToEmail,
            assignedToWhatsapp: this.assignedToWhatsapp,
            stakeholderAssignedTo: this.assignedTo,
            stakeholderAssignedToEmail: this.assignedToEmail,
            stakeholderAssignedToPhoneNumber: this.assignedToPhoneNumber,
            stakeholderAssignedToWhatsapp: this.assignedToWhatsapp
          }
        )
      ),
      switchMap(() =>
        this.svc.assignStakeholder(
          this.valuationId,
          this.vehicleNumber,
          this.applicantContact,
          this.assignedTo,
          this.assignedToPhoneNumber,
          this.assignedToEmail,
          this.assignedToWhatsapp
        )
      ),
      switchMap(() =>
        this.valuationSvc.assignValuation(
          this.valuationId,
          this.vehicleNumber,
          this.applicantContact,
          this.assignedTo,
          this.assignedToPhoneNumber,
          this.assignedToEmail,
          this.assignedToWhatsapp
        )
      ),
      switchMap(async () => {
        await this.historyLogger.logAction(
          this.valuationId,
          'Stakeholder Updated',
          'Stakeholder details have been updated and saved',
          this.assignedTo,
          this.assignedTo
        );
        return of(null);
      })
    ).subscribe({
      next: (): void => {
        this.saving = this.saveInProgress = false;
        this.saved = true;
      },
      error: (err: { message?: string }): void => {
        this.error = err.message || 'Save failed';
        this.saveInProgress = false; 
        this.saving = false;
      }
    });
  }

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
      switchMap(() => this.workflowSvc.completeWorkflow(this.valuationId, 1, this.vehicleNumber, encodeURIComponent(this.applicantContact))),
      switchMap(() => this.workflowSvc.startWorkflow(this.valuationId, 2, this.vehicleNumber, encodeURIComponent(this.applicantContact))),
      switchMap(() => this.valuationSvc.getValuationDetailsfromAttesterApi(this.valuationId, this.vehicleNumber, this.applicantContact)),
      switchMap(() =>
        this.workflowSvc.updateWorkflowTable(
          this.valuationId,
          this.vehicleNumber,
          this.applicantContact,
          {
            workflow: 'Backend',
            workflowStepOrder: 2,
            assignedTo: this.assignedTo,
            assignedToPhoneNumber: this.assignedToPhoneNumber,
            assignedToEmail: this.assignedToEmail,
            assignedToWhatsapp: this.assignedToWhatsapp,
            stakeholderAssignedTo: this.assignedTo,
            stakeholderAssignedToEmail: this.assignedToEmail,
            stakeholderAssignedToPhoneNumber: this.assignedToPhoneNumber,
            stakeholderAssignedToWhatsapp: this.assignedToWhatsapp
          }
        )
      ),
      switchMap(() =>
        this.valuationSvc.assignValuation(
          this.valuationId,
          this.vehicleNumber,
          this.applicantContact,
          this.assignedTo,
          this.assignedToPhoneNumber,
          this.assignedToEmail,
          this.assignedToWhatsapp
        )
      ),
      switchMap(() =>
        this.svc.assignStakeholder(
          this.valuationId,
          this.vehicleNumber,
          this.applicantContact,
          this.assignedTo,
          this.assignedToPhoneNumber,
          this.assignedToEmail,
          this.assignedToWhatsapp
        )
      ),
      switchMap(async () => {
        await this.historyLogger.logAction(
          this.valuationId,
          'Stakeholder Submitted',
          'Stakeholder details submitted to Backend team',
          this.assignedTo,
          this.assignedTo,
          'Stakeholder In Progress',
          'Backend In Progress'
        );
        return of(null);
      })
    ).subscribe({
      next: () => {
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

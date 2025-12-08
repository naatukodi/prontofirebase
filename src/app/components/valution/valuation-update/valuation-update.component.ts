// src/app/components/valuation/valuation-update/valuation-update.component.ts

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ValuationService } from '../../../services/valuation.service';
import { WorkflowService } from '../../../services/workflow.service';
import { VehicleDetails } from '../../../models/VehicleDetails';
import { MatSnackBar } from '@angular/material/snack-bar';
import { switchMap, debounceTime, distinctUntilChanged, take } from 'rxjs/operators';
import { SharedModule } from '../../shared/shared.module/shared.module';
import { WorkflowButtonsComponent } from '../../workflow-buttons/workflow-buttons.component';
import { RouterModule } from '@angular/router';
import { Auth, User, authState } from '@angular/fire/auth';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, Subscription, combineLatest } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { UsersService } from '../../../services/users.service';
import { AssignableUser, UserModel } from '../../../models/user.model';
import { ClaimService } from '../../../services/claim.service';
import { VehicleDuplicateCheckResponse } from '../../../models/vehicle-duplicate-check.interface';

// ✅ USE EXISTING SERVICE
import { HistoryLoggerService } from '../../../services/history-logger.service';


@Component({
  selector: 'app-valuation-update',
  standalone: true,
  imports: [SharedModule, WorkflowButtonsComponent, RouterModule],
  templateUrl: './valuation-update.component.html',
  styleUrls: ['./valuation-update.component.scss']
})
export class ValuationUpdateComponent implements OnInit, OnDestroy {
  valuationId!: string;
  vehicleNumber!: string;
  applicantContact!: string;
  valuationType!: string;

  private usersSvc = inject(UsersService);
  private historyLogger = inject(HistoryLoggerService);  // ✅ INJECT EXISTING SERVICE

  form!: FormGroup;
  loading = true;
  error: string | null = null;
  saving = false;
  saveInProgress = false;
  submitInProgress = false;
  saved = false;

  // For file uploads
  rcFile?: File;
  insuranceFile?: File;
  otherFiles: File[] = [];

  private assignedTo = '';
  private assignedToPhoneNumber = '';
  private assignedToEmail = '';
  private assignedToWhatsapp = '';
  loadingAssigned = false;

  private backendAssignedTo: string = '';
  private backendAssignedToPhoneNumber: string = '';
  private backendAssignedToEmail: string = '';
  private backendAssignedToWhatsapp: string = '';

  usersWithEdit$: Observable<AssignableUser[]> = of([]);
  selectedUserId: string | null = null;
  private selectedUser: AssignableUser | null = null;
  assignFrozen = false;
  assignBusy = false;

  assignedUser: AssignableUser | null = null;

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
  showDuplicateExpanded = false;
  private valueSubscriptions = new Subscription();

  // ✅ ADD THESE FOR TRACKING ORIGINAL DATA
  private originalFormData: any = {};
  private currentUser: User | null = null;
  private currentUserId: string = 'unknown';
  private currentUserName: string = 'Unknown User';


  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private valuationSvc: ValuationService,
    private workflowSvc: WorkflowService,
    private _snackBar: MatSnackBar,
    private userSvc: UsersService,
    private claimSvc: ClaimService,
    private auth: Auth
  ) {}


  ngOnInit(): void {
    this.valuationId = this.route.snapshot.paramMap.get('valuationId')!;

    this.route.queryParamMap.subscribe(params => {
      const vn = params.get('vehicleNumber');
      const ac = params.get('applicantContact');
      this.valuationType = params.get('valuationType')!;
      if (vn && ac) {
        this.vehicleNumber = vn;
        this.applicantContact = ac;
        this.initForm();
        this.loadVehicleDetails();
        this.setupDuplicateCheck();
      } else {
        this.loading = false;
        this.error = 'Missing vehicleNumber or applicantContact in query parameters.';
      }
    });

    // ✅ GET CURRENT USER INFO
    authState(this.auth).pipe(take(1)).subscribe(u => {
      this.currentUser = u;
      if (u) {
        this.currentUserId = u.uid || u.phoneNumber || 'unknown';
        this.resolveDisplayName(u).pipe(take(1)).subscribe(name => {
          this.currentUserName = name || u.email || 'Unknown User';
          this.applyAssignedFromUser(u);
        });
      }
    });

    this.loadAssignableUsers(); 
    this.loadAssignedUser();
  }


  ngOnDestroy(): void {
    this.valueSubscriptions.unsubscribe();
  }


  private initForm() {
    this.form = this.fb.group({
      // Vehicle Identification
      registrationNumber: [{ value: '', disabled: true }],
      make: ['', Validators.required],
      model: ['', Validators.required],
      bodyType: ['', Validators.required],
      yearOfMfg: [null, [Validators.required, Validators.min(1900)]],
      monthOfMfg: [null, [Validators.required, Validators.min(1), Validators.max(12)]],

      // Engine & Specs
      engineNumber: ['', Validators.required],
      chassisNumber: ['', Validators.required],
      engineCC: [null, Validators.required],
      grossVehicleWeight: [null],
      seatingCapacity: [null],

      // Registration & RTO
      dateOfRegistration: ['', Validators.required],
      rto: ['', Validators.required],
      classOfVehicle: ['', Validators.required],
      categoryCode: [''],
      normsType: [''],
      makerVariant: [''],

      // Owner & Address
      ownerName: ['', Validators.required],
      presentAddress: ['', Validators.required],
      permanentAddress: ['', Validators.required],
      hypothecation: [false],
      lender: [''],

      // Insurance
      insurer: [''],
      insurancePolicyNo: [''],
      insuranceValidUpTo: [''],

      // Permit & Fitness
      permitNo: [''],
      permitValidUpTo: [''],
      permitType: [''],
      permitIssued: [''],
      permitFrom: [''],
      fitnessNo: [''],
      fitnessValidTo: [''],

      // Pollution & Tax
      pollutionCertificateNumber: [''],
      pollutionCertificateUpto: [''],
      taxUpto: [''],
      taxPaidUpTo: [''],

      // Additional
      idv: [null],
      exShowroomPrice: [null],
      backlistStatus: [false],
      rcStatus: [false],
      manufacturedDate: [''],

      // URLs
      stencilTraceUrl: [''],
      chassisNoPhotoUrl: [''],
      remarks: ['']
    });
  }


  private setupDuplicateCheck(): void {
    const vehicleNumberControl = this.form.get('registrationNumber');
    const engineNumberControl = this.form.get('engineNumber');
    const chassisNumberControl = this.form.get('chassisNumber');

    if (!vehicleNumberControl || !engineNumberControl || !chassisNumberControl) {
      return;
    }

    const duplicateCheckSub = combineLatest([
      vehicleNumberControl.valueChanges,
      engineNumberControl.valueChanges,
      chassisNumberControl.valueChanges
    ]).pipe(
      debounceTime(1000),
      distinctUntilChanged((prev, curr) => 
        JSON.stringify(prev) === JSON.stringify(curr)
      )
    ).subscribe(([vehicleNo, engineNo, chassisNo]) => {
      if (vehicleNo || engineNo || chassisNo) {
        this.checkForDuplicates(vehicleNo, engineNo, chassisNo);
      } else {
        this.resetDuplicateInfo();
      }
    });

    this.valueSubscriptions.add(duplicateCheckSub);
  }


  private checkForDuplicates(
    vehicleNumber: string, 
    engineNumber: string, 
    chassisNumber: string
  ): void {
    this.isCheckingDuplicate = true;
    
    this.valuationSvc.checkDuplicateVehicle(
      vehicleNumber, 
      engineNumber, 
      chassisNumber
    ).subscribe({
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


  private handleDuplicateResponse(response: VehicleDuplicateCheckResponse): void {
    this.duplicateInfo = response;
    this.showDuplicateWarning = response.isDuplicate;

    if (response.isDuplicate) {
      console.log('⚠️ Duplicate vehicle details detected!');
      console.log('Messages:', response.messages);
      console.log('Existing records:', response.existingRecords);
      
      this._snackBar.open(
        `⚠️ Warning: ${response.messages}`,
        'View Details',
        {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['warning-snackbar']
        }
      );
    }
  }


  private resetDuplicateInfo(): void {
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


  private applyBackendAssignedFromUser(u: User | null): void {
    const name =
      (u?.displayName?.trim() || '') ||
      (u?.email ? u.email.split('@')[0] : '') ||
      (u?.phoneNumber || '') ||
      'User';

    this.backendAssignedTo = name;
    this.backendAssignedToPhoneNumber = u?.phoneNumber || '';
    this.backendAssignedToEmail = u?.email || '';
    this.backendAssignedToWhatsapp = u?.phoneNumber || '';
  }


  private loadAssignedUser(): void {
    this.loadingAssigned = true;
    this.userSvc.getAssignedUser(this.valuationId, this.vehicleNumber, this.applicantContact)
      .pipe(take(1))
      .subscribe({
        next: (u) => { this.assignedUser = u; this.loadingAssigned = false; },
        error: () => { this.assignedUser = null; this.loadingAssigned = false; }
      });
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

      this.backendAssignedTo = safeName;
      this.backendAssignedToPhoneNumber = u?.phoneNumber || '';
      this.backendAssignedToEmail = u?.email || '';
      this.backendAssignedToWhatsapp = u?.phoneNumber || '';
    });
  }


  private loadAssignableUsers(): void {
    this.usersWithEdit$ = this.userSvc.getUsersWithCanEditInspection();
  }


  onSelectAssignable(userId: string): void {
    this.selectedUserId = userId;
    this.assignFrozen = false;
    this.usersWithEdit$.pipe(take(1)).subscribe(list => {
      this.selectedUser = list.find(u => (u.userId || u.email) === userId) ?? null;
    });
  }


  assignSelectedUser(): void {
    if (!this.selectedUser) { return; }
    const name  = this.selectedUser.name ?? '';
    const phone = this.selectedUser.phoneNumber ?? '';
    const email = this.selectedUser.email ?? '';
    const wa    = this.selectedUser.whatsapp ?? phone;

    this.assignBusy = true;
    this.userSvc.assignInspection({
      valuationId: this.valuationId,
      vehicleNumber: this.vehicleNumber,
      applicantContact: this.applicantContact,
      assignedTo: name,
      assignedToPhoneNumber: phone,
      assignedToEmail: email,
      assignedToWhatsapp: wa
    }).pipe(
      switchMap(() =>
        this.valuationSvc.assignValuation(
          this.valuationId,
          this.vehicleNumber,
          this.applicantContact,
          name,
          phone,
          email,
          wa
        )
      )
    ).subscribe({
      next: () => {
        this.assignBusy = false;
        this.assignFrozen = true;
        this._snackBar.open('Inspector assigned successfully', 'Close', {
          duration: 2500, horizontalPosition: 'center', verticalPosition: 'top'
        });
        this.loadAssignedUser();
      },
      error: (err) => {
        this.assignBusy = false;
        this._snackBar.open(err?.message || 'Assignment failed', 'Close', {
          duration: 3000, horizontalPosition: 'center', verticalPosition: 'top'
        });
      }
    });
  }


  private loadVehicleDetails() {
    this.loading = true;
    this.error = null;

    this.valuationSvc
      .getVehicleDetails(this.valuationId, this.vehicleNumber, this.applicantContact)
      .subscribe({
        next: (data: VehicleDetails) => {
          this.patchForm(data);
          // ✅ STORE ORIGINAL DATA FOR COMPARISON
          this.originalFormData = JSON.parse(JSON.stringify(this.form.getRawValue()));
          this.loading = false;
        },
        error: (err) => {
          this.error = err.message || 'Failed to load vehicle details.';
          this.loading = false;
        }
      });
  }


  private patchForm(data: VehicleDetails) {
    this.form.patchValue({
      registrationNumber: data.registrationNumber,
      make: data.make,
      model: data.model,
      bodyType: data.bodyType,
      yearOfMfg: data.yearOfMfg,
      monthOfMfg: data.monthOfMfg,
      engineNumber: data.engineNumber,
      chassisNumber: data.chassisNumber,
      engineCC: data.engineCC,
      grossVehicleWeight: data.grossVehicleWeight,
      seatingCapacity: data.seatingCapacity,
      dateOfRegistration: data.dateOfRegistration?.slice(0, 10) || '',
      rto: data.rto,
      classOfVehicle: data.classOfVehicle,
      categoryCode: data.categoryCode,
      normsType: data.normsType,
      makerVariant: data.makerVariant,
      ownerName: data.ownerName,
      presentAddress: data.presentAddress,
      permanentAddress: data.permanentAddress,
      hypothecation: data.hypothecation,
      lender: data.lender,
      insurer: data.insurer,
      insurancePolicyNo: data.insurancePolicyNo,
      insuranceValidUpTo: data.insuranceValidUpTo?.slice(0, 10) || '',
      permitNo: data.permitNo,
      permitValidUpTo: data.permitValidUpTo?.slice(0, 10) || '',
      permitType: data.permitType,
      permitIssued: data.permitIssued?.slice(0, 10) || '',
      permitFrom: data.permitFrom?.slice(0, 10) || '',
      fitnessNo: data.fitnessNo,
      fitnessValidTo: data.fitnessValidTo?.slice(0, 10) || '',
      pollutionCertificateNumber: data.pollutionCertificateNumber,
      pollutionCertificateUpto: data.pollutionCertificateUpto?.slice(0, 10) || '',
      taxUpto: data.taxUpto?.slice(0, 10) || '',
      idv: data.idv,
      exShowroomPrice: data.exShowroomPrice,
      backlistStatus: data.backlistStatus,
      rcStatus: data.rcStatus,
      manufacturedDate: data.manufacturedDate?.slice(0, 10) || '',
      stencilTraceUrl: data.stencilTraceUrl,
      chassisNoPhotoUrl: data.chassisNoPhotoUrl,
      remarks: data.remarks || ''
    });
  }


  onFileChange(event: Event, field: 'rcFile' | 'insuranceFile'): void {
    const inputEl = event.target as HTMLInputElement;
    if (inputEl.files && inputEl.files.length > 0) {
      if (field === 'rcFile') {
        this.rcFile = inputEl.files[0];
      } else if (field === 'insuranceFile') {
        this.insuranceFile = inputEl.files[0];
      }
    }
  }


  onMultiFileChange(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    if (inputEl.files) {
      this.otherFiles = Array.from(inputEl.files);
    }
  }


  // ✅ NEW METHOD: COMPARE AND TRACK CHANGES
  private getChangedFields(): any[] {
    const currentData = this.form.getRawValue();
    const changedFields: any[] = [];

    Object.keys(currentData).forEach(key => {
      if (this.originalFormData[key] !== currentData[key]) {
        changedFields.push({
          fieldName: key,
          oldValue: this.originalFormData[key],
          newValue: currentData[key]
        });
      }
    });

    return changedFields;
  }


  private buildFormData(): FormData {
    const fd = new FormData();
    const v = this.form.getRawValue();

    fd.append('registrationNumber', v.registrationNumber);
    fd.append('make', v.make);
    fd.append('model', v.model);
    fd.append('bodyType', v.bodyType);
    fd.append('yearOfMfg', v.yearOfMfg.toString());
    fd.append('monthOfMfg', v.monthOfMfg.toString());
    fd.append('engineNumber', v.engineNumber);
    fd.append('chassisNumber', v.chassisNumber);
    fd.append('engineCC', v.engineCC.toString());
    if (v.grossVehicleWeight !== null) {
      fd.append('grossVehicleWeight', v.grossVehicleWeight.toString());
    }
    if (v.seatingCapacity !== null) {
      fd.append('seatingCapacity', v.seatingCapacity.toString());
    }
    fd.append('dateOfRegistration', v.dateOfRegistration);
    fd.append('rto', v.rto);
    fd.append('classOfVehicle', v.classOfVehicle);
    fd.append('categoryCode', v.categoryCode || '');
    fd.append('normsType', v.normsType || '');
    fd.append('makerVariant', v.makerVariant || '');
    fd.append('ownerName', v.ownerName);
    fd.append('presentAddress', v.presentAddress);
    fd.append('permanentAddress', v.permanentAddress);
    fd.append('hypothecation', v.hypothecation ? 'true' : 'false');
    fd.append('lender', v.lender || '');
    fd.append('insurer', v.insurer || '');
    fd.append('insurancePolicyNo', v.insurancePolicyNo || '');
    fd.append('insuranceValidUpTo', v.insuranceValidUpTo || '');
    fd.append('permitNo', v.permitNo || '');
    fd.append('permitValidUpTo', v.permitValidUpTo || '');
    fd.append('permitType', v.permitType || '');
    fd.append('permitIssued', v.permitIssued || '');
    fd.append('permitFrom', v.permitFrom || '');
    fd.append('fitnessNo', v.fitnessNo || '');
    fd.append('fitnessValidTo', v.fitnessValidTo || '');
    fd.append('pollutionCertificateNumber', v.pollutionCertificateNumber || '');
    fd.append('pollutionCertificateUpto', v.pollutionCertificateUpto || '');
    fd.append('taxUpto', v.taxUpto || '');
    fd.append('taxPaidUpTo', v.taxPaidUpTo || '');
    if (v.idv !== null) {
      fd.append('idv', v.idv.toString());
    }
    if (v.exShowroomPrice !== null) {
      fd.append('exShowroomPrice', v.exShowroomPrice.toString());
    }
    fd.append('backlistStatus', v.backlistStatus ? 'true' : 'false');
    fd.append('rcStatus', v.rcStatus ? 'true' : 'false');
    fd.append('manufacturedDate', v.manufacturedDate || '');
    fd.append('stencilTraceUrl', v.stencilTraceUrl || '');
    fd.append('chassisNoPhotoUrl', v.chassisNoPhotoUrl || '');
    fd.append('remarks', v.remarks || '');
    fd.append('AssignedTo', this.assignedTo);
    fd.append('AssignedToPhoneNumber', this.assignedToPhoneNumber);
    fd.append('AssignedToEmail', this.assignedToEmail);
    fd.append('AssignedToWhatsapp', this.assignedToWhatsapp);

    if (this.rcFile) {
      fd.append('rcFile', this.rcFile, this.rcFile.name);
    }
    if (this.insuranceFile) {
      fd.append('insuranceFile', this.insuranceFile, this.insuranceFile.name);
    }
    this.otherFiles.forEach(file => {
      fd.append('otherFiles', file, file.name);
    });

    fd.append('valuationId', this.valuationId);
    fd.append('vehicleNumber', this.vehicleNumber);
    fd.append('applicantContact', this.applicantContact);

    return fd;
  }


  onSave() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.saveInProgress = true;

    const payload = this.buildFormData();
    const changedFields = this.getChangedFields();
    const changedFieldsStr = changedFields.map(f => f.fieldName).join(', ');

    this.valuationSvc
      .updateVehicleDetails(this.valuationId, this.vehicleNumber, this.applicantContact, payload)
      .pipe(
        switchMap(() => this.workflowSvc.startWorkflow(this.valuationId, 2, this.vehicleNumber, encodeURIComponent(this.applicantContact))),
        switchMap(() =>
          this.workflowSvc.updateWorkflowTable(
            this.valuationId,
            this.vehicleNumber,
            this.applicantContact,
            {
              workflow: 'Backend',
              workflowStepOrder: 2,
              backEndAssignedTo: this.backendAssignedTo,
              backEndAssignedToPhoneNumber: this.backendAssignedToPhoneNumber,
              backEndAssignedToEmail: this.backendAssignedToEmail,
              backEndAssignedToWhatsapp: this.backendAssignedToWhatsapp
            }
          )
        ),
        switchMap(() =>
          this.claimSvc.assignBackend(
            this.valuationId,
            this.vehicleNumber,
            this.applicantContact,
            this.backendAssignedTo,
            this.backendAssignedToPhoneNumber,
            this.backendAssignedToEmail,
            this.backendAssignedToWhatsapp
          )
        ),
        // ✅ LOG TO HISTORY (using existing HistoryLoggerService)
        switchMap(() =>
          this.logHistoryAction(
            'Vehicle Details Updated - Saved',
            `${changedFields.length} field(s) updated: ${changedFieldsStr}`,
            null,
            'Backend'
          )
        )
      )
      .subscribe({
        next: () => {
          this.saveInProgress = false;
          this.saving = false;
          this.saved = true;
          this._snackBar.open('✅ Saved successfully and history logged', 'Close', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
          // Update original data after successful save
          this.originalFormData = JSON.parse(JSON.stringify(this.form.getRawValue()));
        },
        error: (err) => {
          this.error = err.message || 'Save failed.';
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

    if (this.duplicateInfo.isDuplicate) {
      const confirmMessage = 
        '⚠️ DUPLICATE VEHICLE DETAILS DETECTED!\n\n' +
        this.duplicateInfo.messages.join('\n') +
        '\n\nFound ' + this.duplicateInfo.totalDuplicatesFound + ' existing record(s).\n\n' +
        'Do you want to proceed anyway?';

      if (!confirm(confirmMessage)) {
        return;
      }
    }

    this.saving = true;
    this.submitInProgress = true;
    const assignedTo = this.assignedUser?.name ?? '';
    const assignedToPhoneNumber = this.assignedUser?.phoneNumber ?? '';
    const assignedToEmail = this.assignedUser?.email ?? '';
    const assignedToWhatsapp = this.assignedUser?.whatsapp ?? assignedToPhoneNumber;
    const changedFields = this.getChangedFields();
    const changedFieldsStr = changedFields.map(f => f.fieldName).join(', ');

    const payload = this.buildFormData();
    this.valuationSvc
      .updateVehicleDetails(this.valuationId, this.vehicleNumber, this.applicantContact, payload)
      .pipe(
        switchMap(() => this.workflowSvc.completeWorkflow(this.valuationId, 2, this.vehicleNumber, encodeURIComponent(this.applicantContact))),
        switchMap(() => this.workflowSvc.startWorkflow(this.valuationId, 3, this.vehicleNumber, encodeURIComponent(this.applicantContact))),
        switchMap(() =>
          this.workflowSvc.updateWorkflowTable(
            this.valuationId,
            this.vehicleNumber,
            this.applicantContact,
            {
              workflow: 'AVO',
              workflowStepOrder: 3,
              backEndAssignedTo: this.backendAssignedTo,
              backEndAssignedToPhoneNumber: this.backendAssignedToPhoneNumber,
              backEndAssignedToEmail: this.backendAssignedToEmail,
              backEndAssignedToWhatsapp: this.backendAssignedToWhatsapp
            }
          ),
        ),
        switchMap(() =>
          this.claimSvc.assignBackend(
            this.valuationId,
            this.vehicleNumber,
            this.applicantContact,
            this.backendAssignedTo,
            this.backendAssignedToPhoneNumber,
            this.backendAssignedToEmail,
            this.backendAssignedToWhatsapp
          )
        ),
        // ✅ LOG TO HISTORY (using existing HistoryLoggerService)
        switchMap(() =>
          this.logHistoryAction(
            'Vehicle Details Submitted - Moving to AVO',
            `Vehicle details submitted. ${changedFields.length} field(s) updated: ${changedFieldsStr}. Status: Backend Complete → AVO In Progress`,
            'Backend',
            'AVO'
          )
        )
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/valuation', this.valuationId, 'vehicle-details'], {
            queryParams: {
              vehicleNumber: this.vehicleNumber,
              applicantContact: this.applicantContact,
              valuationType: this.valuationType
            }
          });
        },
        error: (err) => {
          this.error = err.message || 'Submit failed.';
          this.submitInProgress = false;
          this.saving = false;
        }
      });
  }


  // ✅ NEW METHOD: LOG HISTORY USING EXISTING SERVICE
  private logHistoryAction(
    action: string,
    remarks: string,
    statusFrom: string | null,
    statusTo: string | null
  ): Observable<any> {
    return new Observable(observer => {
      this.historyLogger.logAction(
        this.valuationId,
        action,
        remarks,
        this.currentUserId,
        this.currentUserName,
        statusFrom,
        statusTo
      ).then(() => {
        console.log('✅ History logged:', action);
        observer.next(true);
        observer.complete();
      }).catch((err: any) => {
        console.error('❌ Error logging history:', err);
        observer.next(true); // Don't fail the save if logging fails
        observer.complete();
      });
    });
  }


  onCancel() {
    this.router.navigate(['/valuation', this.valuationId, 'vehicle-details'], {
      queryParams: {
        vehicleNumber: this.vehicleNumber,
        applicantContact: this.applicantContact,
        valuationType: this.valuationType
      }
    });
  }
}

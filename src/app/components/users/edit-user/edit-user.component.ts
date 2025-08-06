// src/app/users/edit-user/edit-user.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap, debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';
import { UsersService } from '../../../services/users.service';
import { PincodeService, PincodeModel } from '../../../services/pincode.service';
import { UserModel } from '../../../models/user.model';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module/shared.module';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-edit-user',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    SharedModule
  ],
  templateUrl: './edit-user.component.html',
  styleUrls: ['./edit-user.component.scss']
})
export class EditUserComponent implements OnInit {
  form!: FormGroup;
  loading = true;
  loadingPincode = false;
  pincodeError: string | null = null;
  submitError: string | null = null;
  locationOptions: PincodeModel[] = [];

  /** Static list of ALL roles – exact casing as API */
  allRoles = [
    'Admin',
    'CanCreateStakeholder',
    'CanEditInspection',
    'CanEditQualityControl',
    'CanEditStakeholder',
    'CanEditVehicleDetails',
    'CanViewDashboard',
    'CanViewFinalReport',
    'CanViewInspection',
    'CanViewQualityControl',
    'CanViewStakeholder',
    'CanViewVehicleDetails'
  ];

  /** Order preference for grouping/sorting */
  private sortOrder = [
    'Dashboard',
    'Stakeholder',
    'VehicleDetails',
    'Inspection',
    'QualityControl',
    'FinalReport'
  ];

  /** Roles assigned to this user (from API) */
  userRoles: string[] = [];
  // near top of class
  allStates: { key: string; name: string; districtCount: number }[] = [];
  userStates: string[] = [];
  selectedStateKey: string | null = null;
  allDistricts: string[] = [];
  userDistricts: string[] = [];

  roleOptions = ['SuperAdmin', 'StateAdmin', 'Admin', 'Stakeholder', 'BackEnd', 'AVO', 'QC', 'FinalReport'];
  branchTypes = ['Head Office', 'onField', 'Branch'];
  serviceStatuses = ['Servicable', 'Non-Servicable'];

  constructor(
    private fb: FormBuilder,
    private usersSvc: UsersService,
    private pinSvc: PincodeService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.buildForm();
    this.setupPincodeLookup();

    // Load user → then roles
    this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id')!;
        return this.usersSvc.getById(id).pipe(
          tap(user => this.patchUser(user)),
          switchMap(user => this.usersSvc.getRoles(user.userId))
        );
      })
    ).subscribe({
      next: roles => {
        this.userRoles = roles;
        this.loadStates();
        this.loading = false;
      },
      error: () => {
        this.submitError = 'Failed to load user or roles';
        this.loading = false;
      }
    });
  }

  private buildForm() {
    this.form = this.fb.group({
      userId: [{ value: '', disabled: true }],
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      roleId: ['', Validators.required],
      whatsapp: [''],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      description: [''],
      branchType: [''],
      serviceStatus: ['Servicable', Validators.required],
      pincode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      location: [null, Validators.required],
      circle: [{ value: '', disabled: true }],
      district: [{ value: '', disabled: true }],
      division: [{ value: '', disabled: true }],
      region: [{ value: '', disabled: true }],
      block: [{ value: '', disabled: true }],
      state: [{ value: '', disabled: true }],
      country: [{ value: '', disabled: true }]
    });
  }

  private setupPincodeLookup() {
    this.form.get('pincode')!.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      tap(() => { this.loadingPincode = true; this.pincodeError = null; }),
      switchMap(pin =>
        this.form.get('pincode')!.valid
          ? this.pinSvc.lookup(pin as string)
          : []
      )
    ).subscribe({
      next: opts => {
        this.loadingPincode = false;
        this.locationOptions = opts;
      },
      error: () => {
        this.loadingPincode = false;
        this.pincodeError = 'Pincode lookup failed';
        this.locationOptions = [];
      }
    });
  }

  private patchUser(user: UserModel) {
    this.form.patchValue({
      userId: user.userId,
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      whatsapp: user.whatsapp,
      phoneNumber: user.phoneNumber,
      description: user.description,
      branchType: user.branchType,
      serviceStatus: user.serviceStatus,
      pincode: user.pincode,
      circle: user.circle,
      district: user.district,
      division: user.division,
      region: user.region,
      block: user.block,
      state: user.state,
      country: user.country
    });
  }

  onLocationChange(sel: PincodeModel) {
    this.form.patchValue({
      circle: sel.name,
      district: sel.district,
      division: sel.division,
      region: sel.name,
      block: sel.block,
      state: sel.state,
      country: sel.country
    });
  }

  private loadStates() {
  const uid = this.form.getRawValue().userId as string;

  // 1️⃣ fetch master list
  this.usersSvc.getStates().pipe(
    tap(states => this.allStates = states),
    // 2️⃣ then fetch user’s
    switchMap(() => this.usersSvc.getUserStates(uid))
  ).subscribe({
    next: userStates => this.userStates = userStates,
    error: () => this.submitError = 'Failed to load states'
  });
}

toggleState(stateName: string) {
  const uid = this.form.getRawValue().userId as string;
  const already = this.userStates.includes(stateName);

  // optimistic UI
  this.userStates = already
    ? this.userStates.filter(s => s !== stateName)
    : [...this.userStates, stateName];

  const call$ = already
    ? this.usersSvc.removeState(uid, stateName)
    : this.usersSvc.addState(uid, stateName);

  call$.subscribe({
    error: () => {
      // revert on failure
      this.userStates = already
        ? [...this.userStates, stateName]
        : this.userStates.filter(s => s !== stateName);
      this.submitError = `Could not ${already ? 'remove' : 'add'} ${stateName}`;
    }
  });
}

get userStateOptions(): { key: string; name: string; districtCount: number }[] {
  return this.allStates.filter(s => this.userStates.includes(s.name));
}

onDistrictStateChange(stateKey: string) {
  this.submitError = null;               // clear old error
  this.selectedStateKey = stateKey;
  const uid = this.form.getRawValue().userId as string;

  this.usersSvc.getDistricts(stateKey).pipe(
    tap(list => this.allDistricts = list),
    switchMap(() =>
      this.usersSvc.getUserDistricts(uid).pipe(
        catchError(() => of([]))         // if user-districts call fails, return empty array
      )
    )
  ).subscribe({
    next: list => this.userDistricts = list,
    error: () => this.submitError = 'Failed to load districts'
  });
}


toggleDistrict(district: string) {
  const uid = this.form.getRawValue().userId as string;
  const has = this.userDistricts.includes(district);

  // optimistic UI update
  this.userDistricts = has
    ? this.userDistricts.filter(d => d !== district)
    : [...this.userDistricts, district];

  const call$ = has
    ? this.usersSvc.removeDistrict(uid, district)
    : this.usersSvc.addDistrict(uid, district);

  call$.subscribe({
    error: () => {
      // revert on failure
      this.userDistricts = has
        ? [...this.userDistricts, district]
        : this.userDistricts.filter(d => d !== district);
      this.submitError = `Could not ${has ? 'remove' : 'add'} ${district}`;
    }
  });
}


  compareByName(a: PincodeModel, b: PincodeModel) {
    return a && b ? a.name === b.name : a === b;
  }

  /** Toggle a single role on/off */
  toggleRole(role: string) {
    const uid = this.form.getRawValue().userId as string;
    const has = this.userRoles.includes(role);

    // optimistic update
    if (has) {
      this.userRoles = this.userRoles.filter(r => r !== role);
    } else {
      this.userRoles = [...this.userRoles, role];
    }

    const call$ = has
      ? this.usersSvc.removeRole(uid, role)
      : this.usersSvc.addRole(uid, role);

    call$.subscribe({
      next: () => { /* OK */ },
      error: () => {
        // revert on failure
        if (has) {
          this.userRoles = [...this.userRoles, role];
        } else {
          this.userRoles = this.userRoles.filter(r => r !== role);
        }
        this.submitError = `Could not ${has ? 'remove' : 'add'} ${role}`;
      }
    });
  }

  formatRole(key: string) {
    return key
      .replace(/^Can/, '')
      .replace(/([A-Z])/g, ' $1')
      .trim();
  }

  private getSortIndex(role: string): number {
    const lowered = role.toLowerCase();
    for (let i = 0; i < this.sortOrder.length; i++) {
      if (lowered.includes(this.sortOrder[i].toLowerCase())) {
        return i;
      }
    }
    return this.sortOrder.length;
  }

  private sortRoles(list: string[]): string[] {
    return [...list].sort((a, b) => this.getSortIndex(a) - this.getSortIndex(b));
  }

  get editRoles(): string[] {
    return this.sortRoles(this.allRoles.filter(r => r.toLowerCase().includes('edit')));
  }

  get viewRoles(): string[] {
    return this.sortRoles(this.allRoles.filter(r => r.toLowerCase().includes('view')));
  }

  get otherRoles(): string[] {
    const used = new Set([...this.editRoles, ...this.viewRoles]);
    return this.sortRoles(this.allRoles.filter(r => !used.has(r)));
  }

  submit() {
    if (this.form.invalid) {
      this.submitError = 'Please fix the errors above';
      return;
    }
    this.submitError = null;

    const raw = this.form.getRawValue();
    const payload: UserModel = {
      userId: raw.userId,
      name: raw.name,
      email: raw.email,
      roleId: raw.roleId,
      whatsapp: raw.whatsapp,
      phoneNumber: raw.phoneNumber,
      description: raw.description,
      branchType: raw.branchType,
      serviceStatus: raw.serviceStatus,
      circle: raw.circle,
      district: raw.district,
      division: raw.division,
      region: raw.region,
      block: raw.block,
      state: raw.state,
      country: raw.country,
      pincode: raw.pincode
    };

    this.usersSvc.update(payload).subscribe({
      next: () => this.router.navigate(['/users']),
      error: err => this.submitError = err.message || 'Update failed'
    });
  }

  onCancel() {
    this.router.navigate(['/users']);
  }
}

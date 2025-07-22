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

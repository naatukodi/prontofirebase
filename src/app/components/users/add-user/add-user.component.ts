// src/app/users/add-user/add-user.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UsersService } from '../../../services/users.service';
import { PincodeService, PincodeModel } from '../../../services/pincode.service';
import { UserModel } from '../../../models/user.model';
import { switchMap, debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
selector: 'app-add-user',
standalone: true,
imports: [
CommonModule,
FormsModule,
ReactiveFormsModule,
SharedModule,
RouterModule
],
templateUrl: './add-user.component.html',
styleUrls: ['./add-user.component.scss']
})
export class AddUserComponent implements OnInit {
form!: FormGroup;
loadingPincode = false;
pincodeError: string | null = null;
submitError: string | null = null;

roleOptions = ['SuperAdmin','StateAdmin','Admin', 'Stakeholder', 'BackEnd', 'AVO', 'QC', 'FinalReport'];
branchTypes = ['Head Office', 'onField', 'Branch'];
serviceStatuses = ['Servicable', 'Non-Servicable'];
locationOptions: PincodeModel[] = [];

constructor(
private fb: FormBuilder,
private usersSvc: UsersService,
private pinSvc: PincodeService,
private router: Router
) {}

ngOnInit() {
this.form = this.fb.group({
    userId: [''],
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

// Set userId to always mirror phoneNumber
this.form.get('phoneNumber')!.valueChanges.subscribe(val => {
    this.form.get('userId')!.setValue(val, { emitEvent: false });
});

this.form.get('pincode')!.valueChanges.pipe(
  debounceTime(500),
  distinctUntilChanged(),
  switchMap(pin => {
    if (this.form.get('pincode')!.valid) {
      this.loadingPincode = true;
      this.pincodeError = null;
      return this.pinSvc.lookup(pin as string);
    }
    this.locationOptions = [];
    return [];
  })
).subscribe({
  next: (res: PincodeModel[]) => {
    this.loadingPincode = false;
    this.locationOptions = res;
  },
  error: () => {
    this.loadingPincode = false;
    this.pincodeError = 'Pincode lookup failed';
    this.locationOptions = [];
  }
});

}

onLocationChange(selected: PincodeModel) {
this.form.patchValue({
location: selected,
circle: selected.name,
district: selected.district,
division: selected.division,
region: selected.name,
block: selected.block,
state: selected.state,
country: selected.country
});
}

compareByName(a: PincodeModel, b: PincodeModel) {
return a && b ? a.name === b.name : a === b;
}

onSubmit() {
    if (this.form.invalid) {
        this.form.markAllAsTouched();
        this.submitError = 'Please fill all required fields';
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
    this.usersSvc.add(payload)
        .pipe(
            tap({
                next: resp => console.log('API success, data=', resp),
                error: err => console.error('API error', err)
            })
        ).subscribe({
            next: () => {
                this.submitError = null;
                this.router.navigate(['/users']);
            },
            error: () => {
                this.submitError = 'Failed to add user. Please try again.';
            }
        });
}
}

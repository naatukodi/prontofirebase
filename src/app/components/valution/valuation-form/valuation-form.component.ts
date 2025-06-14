import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { ClaimService } from '../../../services/claim.service';
import { Valuation } from '../../../models/claim.model';
import { SharedModule } from '../../shared/shared.module/shared.module';

@Component({
  selector: 'app-valuation-form',
  standalone: true,
  imports: [SharedModule, RouterModule],
  templateUrl: './valuation-form.component.html',
  styleUrls: ['./valuation-form.component.scss']
})
export class ValuationFormComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private svc: ClaimService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      id: [''],
      adjusterUserId: ['', Validators.required],
      status: ['Open', Validators.required],
      accidentDate: [new Date().toISOString(), Validators.required],
      accidentLocation: ['', Validators.required],
      policyNumber: ['', Validators.required],

      applicant: this.fb.group({
        name: ['', Validators.required],
        contact: ['', Validators.required]
      }),

      stakeholder: this.fb.group({
        name: [''],
        executiveName: [''],
        executiveContact: [''],
        executiveWhatsapp: ['']
      }),

      vehicleDetails: this.fb.group({
        registrationNumber: ['', Validators.required],
        segment: [''],
        make: [''],
        model: [''],
        yearMfg: [null],
        presentAddress: [''],
        permanentAddress: [''],
        hypothecation: [false],
        insurer: [''],
        dateOfRegistration: [new Date()],
        vehicleClass: [''],
        engineCC: [null],
        gvw: [null],
        seatingCapacity: [null],
        policyValidUpTo: [new Date()],
        idv: [null],
        permitNo: [''],
        permitValidUpTo: [new Date()],
        documents: this.fb.array([])
      }),

      documents: this.fb.array([]),
      components: this.fb.array([]),
      workflow: this.fb.array([]),

      createdAt: [new Date().toISOString()],
      updatedAt: [new Date().toISOString()]
    });

    // initialize one entry in each array
    this.addDocument();
    this.addComponent();
    this.addWorkflow();
    this.addVehicleDoc();
  }

  // --- top‐level Documents ---
  get documents(): FormArray {
    return this.form.get('documents') as FormArray;
  }
  createDocument(): FormGroup {
    return this.fb.group({
      type: [''],
      filePath: [''],
      uploadedAt: [new Date().toISOString()]
    });
  }
  addDocument(): void {
    this.documents.push(this.createDocument());
  }
  removeDocument(i: number): void {
    this.documents.removeAt(i);
  }

  // --- Components ---
  get components(): FormArray {
    return this.form.get('components') as FormArray;
  }
  createComponent(): FormGroup {
    return this.fb.group({
      componentTypeId: [0],
      condition: [''],
      remarks: ['']
    });
  }
  addComponent(): void {
    this.components.push(this.createComponent());
  }
  removeComponent(i: number): void {
    this.components.removeAt(i);
  }

  // --- Workflow Steps ---
  get workflow(): FormArray {
    return this.form.get('workflow') as FormArray;
  }
  createWorkflow(): FormGroup {
    return this.fb.group({
      templateStepId: [0],
      assignedToRole: [''],
      status: [''],
      startedAt: [new Date().toISOString()],
      completedAt: [new Date().toISOString()]
    });
  }
  addWorkflow(): void {
    this.workflow.push(this.createWorkflow());
  }
  removeWorkflow(i: number): void {
    this.workflow.removeAt(i);
  }

  // --- Vehicle Documents nested under vehicleDetails ---
  get vehicleDetails(): FormGroup {
    return this.form.get('vehicleDetails') as FormGroup;
  }
  get vehicleDocs(): FormArray {
    return this.vehicleDetails.get('documents') as FormArray;
  }
  createVehicleDoc(): FormGroup {
    return this.fb.group({
      type: [''],
      filePath: ['']
    });
  }
  addVehicleDoc(): void {
    this.vehicleDocs.push(this.createVehicleDoc());
  }
  removeVehicleDoc(i: number): void {
    this.vehicleDocs.removeAt(i);
  }

  // --- Submit ---
  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    const payload: Valuation = this.form.value;
    this.svc.create(payload).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/']);
      },
      error: err => {
        this.loading = false;
        this.error = err.message || 'Save failed';
      }
    });
  }
}

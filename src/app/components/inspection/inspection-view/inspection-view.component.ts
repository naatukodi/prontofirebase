// src/app/valuation-inspection/inspection-view.component.ts
import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Inspection } from '../../../models/Inspection';
import { InspectionService } from '../../../services/inspection.service';
import { SharedModule } from '../../shared/shared.module/shared.module';
import { AuthorizationService } from '../../../services/authorization.service';
import { WorkflowButtonsComponent } from '../../workflow-buttons/workflow-buttons.component';
import { RouterModule } from '@angular/router';

type ValuationType =
  | 'four-wheeler'
  | 'cv'
  | 'two-wheeler'
  | 'three-wheeler'
  | 'tractor'
  | 'ce';

@Component({
  selector: 'app-valuation-inspection',
  standalone: true,
  imports: [SharedModule, WorkflowButtonsComponent, RouterModule],
  templateUrl: './inspection-view.component.html',
  styleUrls: ['./inspection-view.component.scss']
})
export class InspectionViewComponent implements OnInit {
  loading = true;
  error: string | null = null;
  inspection: Inspection | null = null;

  private authz = new AuthorizationService();

  valuationId!: string;
  vehicleNumber!: string;
  applicantContact!: string;

  valuationType: ValuationType | null = null;

  private visibilityMap: Record<ValuationType, string[]> = {
    'four-wheeler': [
      'inspectionDate','inspectionLocation','frontPhoto','odometer','engineCondition',
      'chassisCondition','steeringSystem','brakeSystem','suspensionSystem','fuelSystem',
      'tyreCondition','bodyCondition','cabinCondition','exteriorCondition','interiorCondition',
      'gearboxAssembly','clutchSystem','driveShafts','propellerShaft','differentialAssy',
      'radiator','interCooler','allHosePipes','paintWork'
    ],
    'cv': [
      'inspectionDate','inspectionLocation','frontPhoto','odometer','engineCondition',
      'chassisCondition','steeringSystem','brakeSystem','electricalSystem','suspensionSystem',
      'fuelSystem','tyreCondition','bodyCondition','cabinCondition','exteriorCondition',
      'interiorCondition','gearboxAssembly','clutchSystem','propellerShaft','differentialAssy',
      'radiator','interCooler','allHosePipes','steeringWheel','steeringColumn','steeringBox',
      'steeringLinkages','bumpers','doors','mudguards','allGlasses','dashBoard','seats',
      'upholestry','interiorTrims','front','rear','axles','airConditioner','audio','paintWork',
      'rightSideWing','leftSideWing','tailGate','loadFloor'
    ],
    'two-wheeler': [
      'inspectionDate','inspectionLocation','frontPhoto','odometer','engineCondition',
      'chassisCondition','steeringSystem','brakeSystem','electricalSystem','suspensionSystem',
      'fuelSystem','tyreCondition','bodyCondition','exteriorCondition','gearboxAssembly',
      'clutchSystem','steeringHandle','frontForkAssy','mudguards','frontFairing','rearCowls',
      'seats','speedoMeter','front','rear','paintWork'
    ],
    'three-wheeler': [
      'inspectionDate','inspectionLocation','frontPhoto','odometer','engineCondition',
      'chassisCondition','steeringSystem','brakeSystem','electricalSystem','suspensionSystem',
      'fuelSystem','tyreCondition','bodyCondition','cabinCondition','exteriorCondition',
      'interiorCondition','gearboxAssembly','clutchSystem','driveShafts','radiator','interCooler',
      'allHosePipes','steeringColumn','steeringBox','steeringLinkages','steeringHandle',
      'frontForkAssy','mudguards','allGlasses','dashBoard','seats','upholestry','interiorTrims',
      'front','rear','axles','airConditioner','audio','paintWork'
    ],
    'tractor': [
      'inspectionDate','inspectionLocation','frontPhoto','odometer','engineCondition',
      'chassisCondition','steeringSystem','brakeSystem','electricalSystem','suspensionSystem',
      'fuelSystem','tyreCondition','bodyCondition','exteriorCondition','gearboxAssembly',
      'clutchSystem','differentialAssy','radiator','interCooler','allHosePipes','steeringWheel',
      'steeringColumn','steeringBox','steeringLinkages','bonnet','bumpers','mudguards','seats',
      'front','rear','axles','paintWork'
    ],
    'ce': [
      'inspectionDate','inspectionLocation','frontPhoto','odometer','engineCondition',
      'chassisCondition','steeringSystem','brakeSystem','electricalSystem','suspensionSystem',
      'fuelSystem','tyreCondition','bodyCondition','cabinCondition','exteriorCondition',
      'interiorCondition','gearboxAssembly','clutchSystem','radiator','interCooler','allHosePipes',
      'steeringWheel','steeringColumn','steeringBox','steeringLinkages','bonnet','mudguards',
      'allGlasses','boom','bucket','chainTrack','hydraulicCylinders','swingUnit','dashBoard',
      'seats','upholestry','interiorTrims','front','rear','axles','airConditioner','paintWork'
    ]
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private inspectionService: InspectionService
  ) {}

  ngOnInit(): void {
    this.valuationType = this.route.snapshot.queryParamMap.get('valuationtype') as ValuationType;

    this.route.paramMap.subscribe(params => {
      const vid = params.get('valuationId');
      if (vid) {
        this.valuationId = vid;
        this.loadQueryParamsAndFetch();
      } else {
        this.loading = false;
        this.error = 'Valuation ID is missing in the route.';
      }
    });
  }

  private loadQueryParamsAndFetch() {
    this.route.queryParamMap.subscribe(qp => {
      const vn = qp.get('vehicleNumber');
      const ac = qp.get('applicantContact');
      if (vn && ac) {
        this.vehicleNumber = vn;
        this.applicantContact = ac;
        this.fetchInspection();
      } else {
        this.loading = false;
        this.error = 'Missing required query parameters.';
      }
    });
  }

  private fetchInspection() {
    this.loading = true;
    this.error = null;

    this.inspectionService
      .getInspectionDetails(this.valuationId, this.vehicleNumber, this.applicantContact)
      .subscribe({
        next: data => {
          this.inspection = data;
          this.loading = false;
        },
        error: (err: HttpErrorResponse) => {
          this.error = err.message || 'Failed to load inspection';
          this.loading = false;
        }
      });
  }

  showField(key: string): boolean {
    if (!this.valuationType) return false;
    return this.visibilityMap[this.valuationType]?.includes(key) ?? false;
  }

  onClick() {
    this.router.navigate(
      ['/valuation', this.valuationId, 'inspection', 'vehicle-image-upload'],
      { queryParams: { vehicleNumber: this.vehicleNumber, applicantContact: this.applicantContact, valuationtype: this.valuationType } }
    );
  }

  onEdit() {
    this.router.navigate(
      ['/valuation', this.valuationId, 'inspection', 'update'],
      { queryParams: { vehicleNumber: this.vehicleNumber, applicantContact: this.applicantContact, valuationtype: this.valuationType } }
    );
  }

  onDelete(): void {
    if (!confirm('Delete this inspection record?')) return;
    this.inspectionService.deleteInspectionDetails(
      this.valuationId, this.vehicleNumber, this.applicantContact
    ).subscribe({
      next: () => this.router.navigate(['/']),
      error: err => (this.error = err.message || 'Delete failed')
    });
  }

  onBack(): void {
    this.router.navigate(
      ['/valuation', this.valuationId],
      { queryParams: { vehicleNumber: this.vehicleNumber, applicantContact: this.applicantContact, valuationtype: this.valuationType } }
    );
  }

  canEditInspection() {
    return this.authz.hasAnyPermission(['CanCreateInspection','CanEditInspection']);
  }

  canDeleteInspection() {
    return this.authz.hasAnyPermission(['CanDeleteInspection']);
  }
}
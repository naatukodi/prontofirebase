import { CommonModule } from '@angular/common'; 
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StakeholderService } from '../../../services/stakeholder.service';
import { WorkflowButtonsComponent } from '../../workflow-buttons/workflow-buttons.component';
import { SharedModule } from '../../shared/shared.module/shared.module';
import { RouterModule } from '@angular/router';
import { AuthorizationService } from '../../../services/authorization.service';
import { FormsModule } from '@angular/forms';
import { CommonNotesComponent } from '../../common-notes/common-notes.component';


@Component({
  selector: 'app-stakeholder-view',
  templateUrl: './stakeholder-view.component.html',
  styleUrls: ['./stakeholder-view.component.scss'],
  imports: [CommonModule, WorkflowButtonsComponent, SharedModule, RouterModule,FormsModule, CommonNotesComponent],
  standalone: true
})
export class StakeholderViewComponent implements OnInit {
  valuationId!: string;
  vehicleNumber!: string;
  applicantContact!: string;
  valuationType!: string;

  private authz = inject(AuthorizationService);

  loading = true;
  error: string | null = null;

  otherDocuments: Array<{ type: string; filePath: string; uploadedAt: string }> = [];

  stakeholder!: {
    id: string;
    Id: string;
    name: string;
    executiveName: string;
    executiveContact: string;
    executiveWhatsapp: string;
    executiveEmail: string;
    valuationType: string | null;
    vehicleNumber: string | null;
    vehicleSegment: string | null;
    vehicleLocation: {
      pincode: string | null;
      block: string | null;
      district: string | null;
      state: string | null;
      country: string | null;
      name?: string | null;
      division?: string | null;
    };
    applicant: { name: string; contact: string };
    documents: Array<{ type: string; filePath: string; uploadedAt: string }>;
    remarks?: string | null;
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: StakeholderService
  ) {}

  ngOnInit(): void {
    this.valuationId = this.route.snapshot.paramMap.get('valuationId')!;
    this.route.queryParamMap.subscribe(params => {
      this.vehicleNumber    = params.get('vehicleNumber')!;
      this.applicantContact = params.get('applicantContact')!;
      this.valuationType = params.get('valuationType')!;
      this.loadStakeholder();
    });
  }

  private loadStakeholder() {
    this.loading = true;
    this.error   = null;
    this.svc.getStakeholder(
      this.valuationId,
      this.vehicleNumber,
      this.applicantContact
    ).subscribe({
      next: data => {
        console.log('Stakeholder data loaded:', data);
        const normalizedData: any = data;
        this.stakeholder = {
          ...(data as any),
          id: (data as any).id || (data as any).Id || this.valuationId,
          vehicleNumber: (data as any).vehicleNumber || this.vehicleNumber 
        };
        this.setOtherDocuments();
        this.loading     = false;
      },
      error: err => {
        this.error   = err.message || 'Failed to load stakeholder';
        this.loading = false;
      }
    });
  }

  private setOtherDocuments() {
    this.otherDocuments = (this.stakeholder.documents || [])
      .filter(doc => doc.type !== 'RC' && doc.type !== 'Insurance');
  }

  onEdit() {
    this.router.navigate(
      ['/valuation', this.valuationId, 'stakeholder', 'update'],
      {
        queryParams: {
          vehicleNumber: this.vehicleNumber,
          applicantContact: this.applicantContact,
          valuationType: this.valuationType
        }
      }
    );
  }

  getDocumentFilePath(type: string): string | undefined {
    return this.stakeholder
      .documents
      .find(d => d.type === type)
      ?.filePath;
  }

  onDelete() {
    if (!confirm('Delete this stakeholder?')) return;
    this.svc.deleteStakeholder(
      this.valuationId,
      this.vehicleNumber,
      this.applicantContact
    ).subscribe({
      next: () => this.router.navigate(['/']),
      error: err => this.error = err.message || 'Delete failed'
    });
  }

  onBack() {
    this.router.navigate(['/valuations', this.valuationId], {
      queryParams: {
        vehicleNumber: this.vehicleNumber,
        applicantContact: this.applicantContact,
        valuationType: this.valuationType
      }
    });
  }

  canEditStakeholder() {
    return this.authz.hasAnyPermission([
      'CanCreateStakeholder',
      'CanEditStakeholder'
    ]);
  }
  canDeleteStakeholder() {
    return this.authz.hasAnyPermission(['CanDeleteStakeholder']);
  }

  getCurrentUser(): string {
  try {
    // Get from localStorage
    const userJson = localStorage.getItem('currentUser') || localStorage.getItem('user') || '{}';
    const user = JSON.parse(userJson);
    return user.name || user.username || user.email || 'User';
  } catch (error) {
    console.error('Error getting current user:', error);
    return 'User';
  }
}
}

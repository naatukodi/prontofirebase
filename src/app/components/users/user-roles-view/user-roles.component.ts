import { Component, OnInit } from '@angular/core';
import { RolesService } from '../../../services/roles.service';
import { ActivatedRoute } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-roles',
  standalone: true,
  imports: [ CommonModule, MatTableModule, MatButtonModule ],
  templateUrl: './user-roles.component.html',
  styleUrls: ['./user-roles.component.scss']
})
export class UserRolesComponent implements OnInit {
  phone!: string;
  roles: string[] = [];
  filtered: string[] = [];
  loading = true;
  error: string | null = null;

  categories = ['All', 'View', 'Create', 'Edit'];
  selected = 'All';

  // counts for each category
  roleCounts: Record<string, number> = { All: 0, View: 0, Create: 0, Edit: 0 };

  displayedColumns = ['role'];

  constructor(
    private svc: RolesService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.phone = this.route.snapshot.paramMap.get('phone') || '';
    this.svc.getUserRoles(this.phone).subscribe({
      next: roles => {
        this.roles = roles;
        this.computeCounts();
        this.applyFilter();
        this.loading = false;
      },
      error: e => {
        this.error = e.message || 'Failed to load roles';
        this.loading = false;
      }
    });
  }

  private computeCounts() {
    this.roleCounts['All'] = this.roles.length;
    this.roleCounts['View'] = this.roles.filter(r => r.startsWith('CanView')).length;
    this.roleCounts['Create'] = this.roles.filter(r => r.startsWith('CanCreate')).length;
    this.roleCounts['Edit'] = this.roles.filter(r => r.startsWith('CanEdit')).length;
  }

  applyFilter() {
    if (this.selected === 'All') {
      this.filtered = this.roles;
    } else {
      this.filtered = this.roles.filter(r => r.startsWith(`Can${this.selected}`));
    }
  }

  onSelect(cat: string) {
    this.selected = cat;
    this.applyFilter();
  }
}

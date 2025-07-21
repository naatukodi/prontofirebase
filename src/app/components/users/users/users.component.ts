// src/app/users/users.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule }          from '@angular/common';
import { UsersService }          from '../../../services/users.service';
import { UserModel }             from '../../../models/user.model';
import { SharedModule } from '../../shared/shared.module/shared.module';
import { Router } from '@angular/router';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    SharedModule
  ],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  users: UserModel[] = [];
  loading = true;
  error: string | null = null;

  /** list all fields you want to display in order */
  displayedColumns: string[] = [
    'userId','name','email','roleId',
    'whatsapp','phoneNumber',
    'description','branchType','serviceStatus',
    'circle','district','division','region',
    'block','state','country','pincode'
  ];

  constructor(private usersSvc: UsersService, private router: Router) {}

  ngOnInit(): void {
    this.usersSvc.getAll().subscribe({
      next: data => {
        this.users = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load users';
        this.loading = false;
      }
    });
  }

  addUser(): void {
      // Navigate to the add user page
      this.router.navigate(['/users/add']);
  }
    
    refresh(): void {
        this.loading = true;
        this.usersSvc.getAll().subscribe({
        next: data => {
            this.users = data;
            this.loading = false;
        },
        error: () => {
            this.error = 'Failed to refresh users';
            this.loading = false;
        }
        });
    }
}

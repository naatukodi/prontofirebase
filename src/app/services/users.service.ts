// src/app/users/users.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { UserModel } from '../models/user.model';
import { environment } from '../../environments/environment';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly base = `${environment.apiBaseUrl}/users`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<UserModel[]> {
    return this.http.get<UserModel[]>(`${this.base}/all`);
  }

add(user: UserModel): Observable<UserModel> {
    const payload = {
        userId: user.userId,
        name: user.name,
        email: user.email,
        roleId: user.roleId,
        whatsapp: user.whatsapp,
        phoneNumber: user.phoneNumber,
        Description: user.description,
        BranchType: user.branchType,
        ServiceStatus: user.serviceStatus,
        Circle: user.circle,
        District: user.district,
        Division: user.division,
        Region: user.region,
        Block: user.block,
        State: user.state,
        Country: user.country,
        Pincode: user.pincode
    };

    return this.http.post<UserModel>(
        `${this.base}`,
        payload
    );
}

 /** Assign a role to a user */
  addRole(userId: string, role: string): Observable<void> {
    const url = `${this.base}/${encodeURIComponent(userId)}/roles/${role}`;
    return this.http.post<void>(url, '', { responseType: 'text' as any });
  }


  /** Remove a role from a user */
  removeRole(userId: string, role: string): Observable<void> {
    const url = `${this.base}/${encodeURIComponent(userId)}/roles/${role}`;
    return this.http.delete<void>(url, { responseType: 'text' as any });
  }

getById(id: string): Observable<UserModel> {
    return this.http.get<UserModel>(`${this.base}/${id}`);
}

getRoles(userId: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/${encodeURIComponent(userId)}/roles`);
}



update(user: UserModel): Observable<UserModel> {
    const payload = {
        userId: user.userId,
        name: user.name,
        email: user.email,
        roleId: user.roleId,
        whatsapp: user.whatsapp,
        phoneNumber: user.phoneNumber,
        Description: user.description,
        BranchType: user.branchType,
        ServiceStatus: user.serviceStatus,
        Circle: user.circle,
        District: user.district,
        Division: user.division,
        Region: user.region,
        Block: user.block,
        State: user.state,
        Country: user.country,
        Pincode: user.pincode
    };

    return this.http.post<UserModel>(
        `${this.base}`,
        payload
    );
}
}

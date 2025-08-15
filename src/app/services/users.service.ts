// src/app/users/users.service.ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { UserModel, AssignableUser } from '../models/user.model';
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

/** Fetch users who have the given permission role */
  getUsersByRole(permission: string): Observable<UserModel[]> {
    return this.http.get<UserModel[]>(`${this.base}/roles/${permission}`);
  }

getStates(): Observable<{ key: string; name: string; districtCount: number }[]> {
  return this.http.get<any[]>(`${environment.apiBaseUrl}/states`);
}

getUserStates(userId: string): Observable<string[]> {
  return this.http.get<string[]>(`${environment.apiBaseUrl}/users/${userId}/States`);
}

addState(userId: string, state: string): Observable<void> {
  return this.http.post<void>(
    `${environment.apiBaseUrl}/us/ers/${userId}/States`,
    JSON.stringify(state),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

removeState(userId: string, state: string): Observable<void> {
  return this.http.delete<void>(
    `${environment.apiBaseUrl}/users/${userId}/States/${encodeURIComponent(state)}`
  );
}

getDistricts(stateKey: string): Observable<string[]> {
  return this.http.get<string[]>(`${environment.apiBaseUrl}/states/${stateKey}/districts`);
}

getUserDistricts(userId: string): Observable<string[]> {
  return this.http.get<string[]>(`${environment.apiBaseUrl}/users/${userId}/Districts`);
}

addDistrict(userId: string, district: string): Observable<void> {
  return this.http.post<void>(
    `${environment.apiBaseUrl}/users/${userId}/Districts`,
    JSON.stringify(district),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

removeDistrict(userId: string, district: string): Observable<void> {
  return this.http.delete<void>(
    `${environment.apiBaseUrl}/users/${userId}/Districts/${encodeURIComponent(district)}`
  );
}

getAssignedUser(
    valuationId: string,
    vehicleNumber: string,
    applicantContact: string
): Observable<UserModel> {
    const params = new HttpParams()
        .set('valuationId', valuationId)
        .set('vehicleNumber', vehicleNumber)
        .set('applicantContact', applicantContact);

    const url = `${environment.apiBaseUrl}valuations/workflows/open/assignedto`;
    return this.http.get<UserModel>(url, { params });
}

assignInspection(params: {
  valuationId: string;
  vehicleNumber: string;
  applicantContact: string;
  assignedTo: string;
  assignedToPhoneNumber: string;
  assignedToEmail: string;
  assignedToWhatsapp: string;
  }): Observable<void> {
  const httpParams = new HttpParams()
    .set('id', params.valuationId)
    .set('vehicleNumber', params.vehicleNumber)
    .set('applicantContact', params.applicantContact)
    .set('assignedTo', params.assignedTo)
    .set('assignedToPhoneNumber', params.assignedToPhoneNumber)
    .set('assignedToEmail', params.assignedToEmail)
    .set('assignedToWhatsapp', params.assignedToWhatsapp);

  return this.http.post<void>(
    `${environment.apiBaseUrl}/valuations/${encodeURIComponent(params.valuationId)}/inspection/assignment`,
    '',
    { params: httpParams }
  );
  }

  getUsersWithCanEditInspection(): Observable<AssignableUser[]> {
    return this.http
      .get<AssignableUser[]>(`${this.base}/roles/CanEditInspection`)
      .pipe(
        map(list => (list || []).map(u => ({
          userId: u?.userId ?? null,
          name: u?.name ?? (u?.email ? u.email.split('@')[0] : null),
          email: u?.email ?? null,
          phoneNumber: u?.phoneNumber ?? (u?.whatsapp ?? null),
          whatsapp: u?.whatsapp ?? (u?.phoneNumber ?? null),
        }))),
        shareReplay(1)
      );
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

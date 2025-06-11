// src/app/auth.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpInterceptor, HttpRequest, HttpHandler
} from '@angular/common/http';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { getAuth, Auth } from 'firebase/auth';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private auth: Auth = getAuth();
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    return from(this.auth.currentUser!.getIdToken()).pipe(
      switchMap(token => {
        const authReq = req.clone({
          setHeaders: { Authorization: `Bearer ${token}` }
        });
        return next.handle(authReq);
      })
    );
  }
}

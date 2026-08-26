import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent
} from '@angular/common/http';
import { from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { getAuth, Auth } from 'firebase/auth';
import { BrandService } from '../services/brand.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private auth: Auth = getAuth();
  private brand = inject(BrandService);

  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    // X-Brand goes on every call, signed in or not: it decides which company a new
    // case is stamped with and which company's cases a listing returns. Clients that
    // omit it (the mobile and camera apps) stay unscoped and keep working unchanged.
    const brandHeader = { 'X-Brand': this.brand.active() };

    const user = this.auth.currentUser;
    if (!user) {
      return next.handle(req.clone({ setHeaders: brandHeader }));
    }

    return from(user.getIdToken()).pipe(
      switchMap(token => {
        const authReq = req.clone({
          setHeaders: {
            ...brandHeader,
            Authorization: `Bearer ${token}`
          }
        });
        return next.handle(authReq);
      })
    );
  }
}

// src/app/auth.guard.ts
import { inject, Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { onAuthStateChanged } from 'firebase/auth';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  private auth = inject(Auth);
  private router = inject(Router);

  canActivate(): Promise<boolean> {
    return new Promise(res => {
      onAuthStateChanged(this.auth, user => {
        if (user) {
          res(true);
        } else {
          this.router.navigate(['/login']);
          res(false);
        }
        
      });
    });
  }
}

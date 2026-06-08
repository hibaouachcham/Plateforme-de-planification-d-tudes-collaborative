import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

export const roleGuard = (allowedRoles: UserRole[]): CanActivateFn => {
  return () => {
    const auth   = inject(AuthService);
    const router = inject(Router);
    const user   = auth.currentUser();

    if (!user) {
      return router.createUrlTree(['/auth']);
    }

    if (allowedRoles.includes(user.role)) {
      return true;
    }

    return router.createUrlTree(['/app/dashboard']);
  };
};
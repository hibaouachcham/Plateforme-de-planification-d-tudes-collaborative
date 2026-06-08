import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Garde les routes réservées aux étudiants.
 * Si l'utilisateur est admin, redirige vers /app/admin.
 */
export const studentOnlyGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isAdmin()) return router.createUrlTree(['/app/admin']);
  return true;
};

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';

/**
 * Intercepteur HTTP — sécurité des requêtes.
 *
 * Deux rôles :
 *   1. Ajoute `withCredentials: true` sur toutes les requêtes,
 *      afin que le navigateur envoie automatiquement le cookie
 *      refresh_token HttpOnly vers le backend.
 *
 *   2. Attache le header `Authorization: Bearer <token>` depuis
 *      la mémoire (jamais depuis localStorage).
 *
 *   3. Sur 401 ou 403 : tente un refresh silencieux, puis relance la requête.
 *      Si le refresh échoue → déconnexion automatique.
 *      Note : Spring Security retourne 403 quand aucun AuthenticationEntryPoint personnalisé
 *      n'est configuré — on intercepte les deux codes pour être robuste.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const authService  = inject(AuthService);

  // Toutes les requêtes incluent les credentials (cookie refresh_token)
  let authReq = req.clone({ withCredentials: true });

  // Routes publiques : pas de header Authorization
  const publicRoutes = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/forgot-password'];
  const isPublic = publicRoutes.some((r) => req.url.includes(r));

  if (!isPublic) {
    const accessToken = tokenService.getAccessToken();
    if (accessToken) {
      authReq = authReq.clone({
        setHeaders: { Authorization: `Bearer ${accessToken}` },
      });
    }
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Sur 401/403 (token absent ou expiré), tenter un refresh silencieux via le cookie
      if ((error.status === 401 || error.status === 403) && !req.url.includes('/auth/refresh')) {
        return tokenService.refreshAccessToken().pipe(
          switchMap((newToken) => {
            // Relancer la requête initiale avec le nouveau token
            const retryReq = req.clone({
              withCredentials: true,
              setHeaders: { Authorization: `Bearer ${newToken}` },
            });
            return next(retryReq);
          }),
          catchError((refreshError) => {
            // Refresh impossible → déconnexion
            authService.logout();
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};

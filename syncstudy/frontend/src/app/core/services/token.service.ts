import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { API_PATHS } from '../api/api.constants';

/**
 * Gestion des tokens d'authentification.
 *
 * Stratégie de sécurité :
 *   - Access token  → stocké en MÉMOIRE uniquement (variable privée).
 *     Inaccessible depuis localStorage, donc protégé contre le vol par XSS.
 *     Perdu au rechargement de page → renouvelé automatiquement via le cookie.
 *
 *   - Refresh token → stocké dans un cookie HttpOnly; SameSite=Lax; Path=/auth
 *     posé par le backend. Inaccessible au JavaScript → protégé contre XSS.
 *     Envoyé automatiquement par le navigateur sur les requêtes vers /auth/*.
 */
@Injectable({ providedIn: 'root' })
export class TokenService {

  /** Access token en mémoire — jamais persisté dans le navigateur. */
  private _accessToken: string | null = null;

  constructor(private http: HttpClient) {}

  // ── Lecture ────────────────────────────────────────────────────────────────

  getAccessToken(): string | null {
    return this._accessToken;
  }

  /**
   * Le refresh token est géré exclusivement par le cookie HttpOnly du backend.
   * Cette méthode retourne toujours null — conservée pour la compatibilité
   * avec les appels existants dans auth.service.ts.
   */
  getRefreshToken(): string | null {
    return null;
  }

  // ── Écriture ───────────────────────────────────────────────────────────────

  /**
   * Stocke l'access token en mémoire.
   * Le paramètre refreshToken est ignoré : le backend gère le cookie directement.
   */
  setTokens(accessToken: string, _refreshToken: string): void {
    this._accessToken = accessToken;
  }

  clearTokens(): void {
    this._accessToken = null;
  }

  // ── Refresh ────────────────────────────────────────────────────────────────

  /**
   * Renouvelle l'access token en appelant POST /auth/refresh.
   *
   * Aucun token n'est envoyé dans le corps : le navigateur envoie automatiquement
   * le cookie refresh_token HttpOnly grâce à `withCredentials: true`
   * (configuré dans l'intercepteur HTTP).
   */
  refreshAccessToken() {
    return this.http.post<{ accessToken: string }>(
      API_PATHS.authRefresh,
      {}   // corps vide — le refresh token voyage dans le cookie
    ).pipe(
      map((res) => {
        this._accessToken = res.accessToken;
        return res.accessToken;
      })
    );
  }
}

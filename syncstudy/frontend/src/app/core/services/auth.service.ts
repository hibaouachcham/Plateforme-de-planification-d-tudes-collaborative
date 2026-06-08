import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { User, UserRole, StudyPreferences } from '../models/user.model';
import { PlanningService } from './planning.service';
import { TokenService } from './token.service';
import { API_PATHS } from '../api/api.constants';
import { NotificationService } from './notification.service';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _currentUser = signal<User | null>(null);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);
  readonly isAdmin = computed(() => this._currentUser()?.role === 'admin');

  constructor(
    private router: Router,
    private planning: PlanningService,
    private notifications: NotificationService,
    private http: HttpClient,
    private tokenService: TokenService
  ) {
    const stored = localStorage.getItem('ss_user');
    if (stored) {
      try {
        const u = JSON.parse(stored) as User;
        this._currentUser.set(this.normalizeUser(u));
        // Rehydrate from backend to avoid stale/empty workspace after token expiry/app reload.
        this.hydrateSessionFromBackend();
      } catch {
        /* ignore */
      }
    }
  }

  private hydrateSessionFromBackend(): void {
    // Avec le nouveau système de cookies HttpOnly, le refresh token n'est plus
    // accessible en JS (getRefreshToken() retourne null).
    // On tente toujours un refresh via le cookie, puis on charge le profil.
    this.tokenService.refreshAccessToken().pipe(
      switchMap(() =>
        this.http.get<User>(API_PATHS.usersMe).pipe(
          map((me) => this.normalizeUser(me))
        )
      ),
      catchError(() => of(null))
    ).subscribe((user) => {
      if (!user) {
        this.tokenService.clearTokens();
        this._currentUser.set(null);
        this.persist(null);
        return;
      }
      this._currentUser.set(user);
      this.persist(user);
      this.planning.loadFromBackend();
      this.notifications.loadNotifications();
    });
  }

  private normalizeUser(u: User): User {
    const legacy = (u as { role?: string }).role;
    const role: UserRole =
      legacy === 'admin' ? 'admin' : 'student';
    return {
      ...u,
      role,
      onboardingCompleted: u.onboardingCompleted ?? true,
      preferences: {
        preferredSessionMinutes: u.preferences?.preferredSessionMinutes ?? 45,
        restDayIndices: u.preferences?.restDayIndices ?? [],
      },
    };
  }

  private persist(user: User | null): void {
    if (user) localStorage.setItem('ss_user', JSON.stringify(user));
    else localStorage.removeItem('ss_user');
  }

  login(email: string, password: string): Observable<void> {
    return this.http.post<{ accessToken: string; refreshToken: string; user: User }>(
      API_PATHS.authLogin,
      { email, password }
    ).pipe(
      switchMap((res) => {
        this.tokenService.setTokens(res.accessToken, res.refreshToken);
        return this.http.get<User>(API_PATHS.usersMe).pipe(
          map((me) => this.normalizeUser(me))
        );
      }),
      tap((user) => {
        this._currentUser.set(user);
        this.persist(user);
        this.planning.loadFromBackend();
        this.notifications.loadNotifications();
      }),
      map(() => void 0)
    );
  }

  signup(
    name: string,
    email: string,
    password: string,
    extra?: { school?: string; level?: string; phone?: string; birthDate?: string; passwordHint?: string }
  ): Observable<void> {
    return this.http.post<{ accessToken: string; refreshToken: string; user: User }>(
      API_PATHS.authRegister,
      {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        school: extra?.school?.trim(),
        level: extra?.level?.trim(),
        phone: extra?.phone?.trim(),
        birthDate: extra?.birthDate?.trim(),
        passwordHint: extra?.passwordHint?.trim() || undefined,
      }
    ).pipe(
      map((res) => {
        this.tokenService.setTokens(res.accessToken, res.refreshToken);
        return this.normalizeUser({ ...res.user, onboardingCompleted: true });
      }),
      tap((user) => {
        this.planning.resetForNewStudent();
        this._currentUser.set(user);
        this.persist(user);
        this.planning.loadFromBackend();
        this.notifications.loadNotifications();
      }),
      map(() => void 0)
    );
  }

  requestPasswordReset(email: string): Observable<void> {
    return this.http.post<void>(API_PATHS.authForgotPassword, { email }).pipe(
      map(() => void 0)
    );
  }

  resetPasswordDirect(email: string, newPassword: string, hint: string): Observable<void> {
    return this.http.post<void>(API_PATHS.authResetPasswordDirect, { email, newPassword, hint }).pipe(
      map(() => void 0)
    );
  }

  /** Récupère l'indice mémo d'un compte — utilisé après 2 échecs de connexion. */
  getPasswordHint(email: string): Observable<string> {
    return this.http.get<{ hint: string }>(API_PATHS.authPasswordHint, { params: { email } }).pipe(
      map((res) => res.hint ?? ''),
      catchError(() => of(''))
    );
  }

  logout(): void {
    // Corps vide : le backend lit le refresh token depuis le cookie HttpOnly
    // et l'invalide. withCredentials est géré par l'intercepteur.
    this.http.post(API_PATHS.authLogout, {}).subscribe({ error: () => {} });
    this.tokenService.clearTokens();
    this._currentUser.set(null);
    this.persist(null);
    void this.router.navigate(['/']);
  }

  updateAvatar(avatar: string): void {
    const user = this._currentUser();
    if (user) {
      const updated = { ...user, avatar };
      this._currentUser.set(updated);
      this.persist(updated);
    }
  }

  /** Met à jour profil + préférences (champs partiels) */
  updateProfile(
    partial: Partial<Pick<User, 'name' | 'email' | 'school' | 'level' | 'phone' | 'birthDate' | 'onboardingCompleted'>> & {
      preferences?: StudyPreferences;
    }
  ): void {
    const user = this._currentUser();
    if (!user) return;
    const preferences: StudyPreferences = {
      ...user.preferences,
      ...partial.preferences,
    };
    const updated = this.normalizeUser({
      ...user,
      ...partial,
      preferences,
    });
    this._currentUser.set(updated);
    this.persist(updated);
  }

  updateProfileHttp(
    partial: Partial<Pick<User, 'name' | 'email' | 'school' | 'level' | 'phone' | 'birthDate' | 'onboardingCompleted'>> & {
      preferences?: StudyPreferences;
    }
  ): Observable<void> {
    return this.http.put<User>(API_PATHS.usersMe, partial).pipe(
      tap(() => {
        this.updateProfile(partial);
      }),
      map(() => void 0)
    );
  }

  changePasswordHttp(oldPassword: string, newPassword: string): Observable<void> {
    return this.http.put<void>(API_PATHS.usersMePassword, { oldPassword, newPassword }).pipe(
      map(() => void 0)
    );
  }

  completeOnboarding(): void {
    const user = this._currentUser();
    if (!user) return;
    const updated = this.normalizeUser({ ...user, onboardingCompleted: true });
    this._currentUser.set(updated);
    this.persist(updated);
  }

  completeOnboardingHttp(): Observable<void> {
    return this.updateProfileHttp({ onboardingCompleted: true }).pipe(
      tap(() => this.completeOnboarding())
    );
  }
}

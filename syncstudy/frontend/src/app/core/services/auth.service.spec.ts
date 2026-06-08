import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { API_PATHS } from '../api/api.constants';

describe('AuthService', () => {
  let httpMock: HttpTestingController;

  /** Données d'un utilisateur réutilisées dans plusieurs tests */
  const hibaUser = {
    id: 'u1',
    name: 'Hiba Ouachcham',
    email: 'hiba@example.com',
    role: 'admin' as const,
    status: 'active' as const,
    joinedDate: '2024-01-15',
    school: "École d'Ingénieurs",
    level: 'Cycle Ingénieur - 1ère année',
  };

  /**
   * Helper : flush la séquence complète déclenchée par login().
   *
   * login() enchaîne :
   *   1. POST  /auth/login
   *   2. GET   /users/me       (switchMap)
   *   3. planning.loadFromBackend()  →  plusieurs requêtes GET/POST
   *   4. notifications.loadNotifications()  →  GET /notifications
   *
   * On flush (1) avec les tokens, (2) avec l'utilisateur reçu,
   * puis on absorbe tout le reste avec des tableaux vides.
   */
  function flushLogin(mock: HttpTestingController): void {
    mock.expectOne(API_PATHS.authLogin).flush({
      accessToken: 'acc-token',
      refreshToken: 'ref-token',
      user: hibaUser,
    });
    // Flush GET /users/me déclenché par le switchMap
    mock.expectOne(API_PATHS.usersMe).flush(hibaUser);
    // Absorbe planning (subjects, migrate, sync, availabilities, sessions) + notifications
    mock.match(() => true).forEach((r) => r.flush([]));
    // POST sessionSyncGroupSessions → son callback next() déclenche loadSessionsFromBackend()
    // → un deuxième GET /sessions apparaît après le premier match(), on le flush aussi
    mock.match(() => true).forEach((r) => r.flush([]));
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([]), HttpClientTestingModule],
      providers: [AuthService],
    });
    spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('starts unauthenticated when storage is empty', () => {
    const auth = TestBed.inject(AuthService);
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.currentUser()).toBeNull();
  });

  it('login sets user and persists', () => {
    const auth = TestBed.inject(AuthService);
    auth.login('a@b.c', 'x').subscribe();

    // 1. Flush POST /auth/login
    httpMock.expectOne(API_PATHS.authLogin).flush({
      accessToken: 'acc-token',
      refreshToken: 'ref-token',
      user: hibaUser,
    });
    // 2. Flush GET /users/me (switchMap interne de login())
    httpMock.expectOne(API_PATHS.usersMe).flush(hibaUser);
    // 3. Absorbe planning + notifications (2 passes : sync crée un 2e GET /sessions)
    httpMock.match(() => true).forEach((r) => r.flush([]));
    httpMock.match(() => true).forEach((r) => r.flush([]));

    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.currentUser()?.email).toBe('hiba@example.com');
    expect(localStorage.getItem('ss_user')).toContain('hiba@example.com');
  });

  it('logout clears user and storage', () => {
    const auth = TestBed.inject(AuthService);
    auth.login('a', 'b').subscribe();
    flushLogin(httpMock);

    httpMock.expectNone(API_PATHS.authLogout);
    auth.logout();
    httpMock.expectOne(API_PATHS.authLogout).flush({});
    expect(auth.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('ss_user')).toBeNull();
  });

  it('normalizes legacy role user to student from localStorage', () => {
    localStorage.setItem(
      'ss_user',
      JSON.stringify({
        id: 'z',
        name: 'Z',
        email: 'z@z.z',
        role: 'user',
        status: 'active',
        joinedDate: '2024-01-01',
        school: 'S',
        level: 'L1',
      })
    );
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([]), HttpClientTestingModule],
      providers: [AuthService],
    });
    spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
    const newMock = TestBed.inject(HttpTestingController);

    // La normalisation du rôle est synchrone (constructeur)
    expect(TestBed.inject(AuthService).currentUser()?.role).toBe('student');

    // hydrateSessionFromBackend() tente un refresh via le cookie → simuler un échec
    // (pas de cookie valide en test → le service efface la session, ce qui est correct)
    newMock.expectOne(API_PATHS.authRefresh).error(new ProgressEvent('network'));
    newMock.verify();
  });

  it('updateProfile merges preferences', () => {
    const auth = TestBed.inject(AuthService);
    auth.login('a', 'b').subscribe();
    flushLogin(httpMock);

    auth.updateProfile({
      preferences: { preferredSessionMinutes: 60, restDayIndices: [6] },
    });
    const u = auth.currentUser();
    expect(u?.preferences?.preferredSessionMinutes).toBe(60);
    expect(u?.preferences?.restDayIndices).toEqual([6]);
  });
});

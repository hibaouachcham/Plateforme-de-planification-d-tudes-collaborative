import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { adminGuard } from '../app/core/guards/admin.guard';
import { AuthService } from '../app/core/services/auth.service';
import { User } from '../app/core/models/user.model';

describe('adminGuard', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  const baseUser = (role: User['role']): User => ({
    id: 'u1',
    name: 'Test User',
    email: 'test@example.com',
    role,
    status: 'active',
    joinedDate: '2024-01-01',
    school: 'ENSA',
    level: 'L3',
  });

  /** Place un utilisateur dans localStorage et réinitialise le TestBed */
  function setupWithUser(user: User | null): void {
    if (user) {
      localStorage.setItem('ss_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('ss_user');
    }
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([]), HttpClientTestingModule],
      providers: [AuthService],
    });
    spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
  }

  beforeEach(() => {
    localStorage.removeItem('ss_user');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([]), HttpClientTestingModule],
      providers: [AuthService],
    });
    spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
  });

  afterEach(() => {
    localStorage.removeItem('ss_user');
  });

  it('autorise la navigation (retourne true) pour un utilisateur admin', () => {
    setupWithUser(baseUser('admin'));
    const result = TestBed.runInInjectionContext(() => adminGuard(route, state));
    expect(result).toBe(true);
  });

  it('le retour pour admin est un boolean et non une UrlTree', () => {
    setupWithUser(baseUser('admin'));
    const result = TestBed.runInInjectionContext(() => adminGuard(route, state));
    expect(result instanceof UrlTree).toBe(false);
  });

  it('redirige un étudiant vers /app/planning', () => {
    setupWithUser(baseUser('student'));
    const router = TestBed.inject(Router);
    const result = TestBed.runInInjectionContext(() => adminGuard(route, state));
    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe(
      router.createUrlTree(['/app/planning']).toString()
    );
  });

  it('redirige un utilisateur non authentifié vers /app/planning', () => {
    setupWithUser(null);
    const router = TestBed.inject(Router);
    const result = TestBed.runInInjectionContext(() => adminGuard(route, state));
    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe(
      router.createUrlTree(['/app/planning']).toString()
    );
  });
});

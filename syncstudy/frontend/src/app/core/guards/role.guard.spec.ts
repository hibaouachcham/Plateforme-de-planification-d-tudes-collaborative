import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { roleGuard } from './role.guard';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';

describe('roleGuard', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  const baseUser = (role: User['role']): User => ({
    id: 't1',
    name: 'Test',
    email: 't@test.fr',
    role,
    status: 'active',
    joinedDate: '2024-01-01',
    school: 'X',
    level: 'L3',
  });

  beforeEach(() => {
    localStorage.removeItem('ss_user');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([]), HttpClientTestingModule],
      providers: [AuthService],
    });
    spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
  });

  function seedUser(u: User): void {
    localStorage.setItem('ss_user', JSON.stringify(u));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([]), HttpClientTestingModule],
      providers: [AuthService],
    });
    spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
  }

  it('allows admin for admin-only route', () => {
    seedUser(baseUser('admin'));
    const guard = roleGuard(['admin']);
    expect(TestBed.runInInjectionContext(() => guard(route, state))).toBe(true);
  });

  it('redirects student away from admin route', () => {
    seedUser(baseUser('student'));
    const router = TestBed.inject(Router);
    const guard = roleGuard(['admin']);
    const result = TestBed.runInInjectionContext(() => guard(route, state));
    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe(
      router.createUrlTree(['/app/dashboard']).toString()
    );
  });

  it('redirects to /auth when no user', () => {
    const router = TestBed.inject(Router);
    const guard = roleGuard(['admin']);
    const result = TestBed.runInInjectionContext(() => guard(route, state));
    expect((result as UrlTree).toString()).toBe(
      router.createUrlTree(['/auth']).toString()
    );
  });
});

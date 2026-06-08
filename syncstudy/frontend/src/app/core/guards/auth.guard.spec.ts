import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  beforeEach(() => {
    localStorage.removeItem('ss_user');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([]), HttpClientTestingModule],
      providers: [AuthService],
    });
    spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
  });

  it('allows navigation when authenticated', () => {
    localStorage.setItem('ss_user', JSON.stringify({
      id: 'u1',
      name: 'Test',
      email: 'test@example.com',
      role: 'student',
      status: 'active',
      joinedDate: '2024-01-01',
      school: 'S',
      level: 'L1',
    }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([]), HttpClientTestingModule],
      providers: [AuthService],
    });
    spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
    const ok = TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(ok).toBe(true);
  });

  it('redirects to /auth when not authenticated', () => {
    const router = TestBed.inject(Router);
    const result = TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe(router.createUrlTree(['/auth']).toString());
  });
});

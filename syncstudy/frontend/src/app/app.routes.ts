import { inject } from '@angular/core';
import { Routes, Router } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { studentOnlyGuard } from './core/guards/student-only.guard';
import { AuthService } from './core/services/auth.service';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'auth',
    loadComponent: () =>
      import('./features/auth/components/auth-dialog/auth-page.component').then((m) => m.AuthPageComponent),
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./features/landing/about.component').then((m) => m.AboutComponent),
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./features/landing/contact.component').then((m) => m.ContactComponent),
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./features/landing/privacy.component').then((m) => m.PrivacyComponent),
  },
  {
    path: 'terms',
    loadComponent: () =>
      import('./features/landing/terms.component').then((m) => m.TermsComponent),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/components/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [() => {
          const auth   = inject(AuthService);
          const router = inject(Router);
          return router.createUrlTree([auth.isAdmin() ? '/app/admin' : '/app/dashboard']);
        }],
        loadComponent: () => import('./features/planning/pages/dashboard-page.component').then((m) => m.DashboardPageComponent),
      },

      { path: 'dashboard', canActivate: [studentOnlyGuard], loadComponent: () => import('./features/planning/pages/dashboard-page.component').then((m) => m.DashboardPageComponent) },
      { path: 'onboarding',    loadComponent: () => import('./features/auth/pages/onboarding-page.component').then((m) => m.OnboardingPageComponent) },
      { path: 'planning',      loadComponent: () => import('./features/planning/pages/calendar-page.component').then((m) => m.CalendarPageComponent) },
      { path: 'calendar',      redirectTo: 'planning', pathMatch: 'full' },
      { path: 'availabilities', loadComponent: () => import('./features/planning/pages/availabilities-page.component').then((m) => m.AvailabilitiesPageComponent) },
      { path: 'sessions',      loadComponent: () => import('./features/sessions/pages/sessions-page.component').then((m) => m.SessionsPageComponent) },
      { path: 'sessions/active/:id', loadComponent: () => import('./features/sessions/pages/active-session-page.component').then((m) => m.ActiveSessionPageComponent) },
      { path: 'sessions/details/:id', loadComponent: () => import('./features/sessions/pages/session-details-page.component').then((m) => m.SessionDetailsPageComponent) },
      { path: 'subjects',      loadComponent: () => import('./features/subjects/pages/subjects-page.component').then((m) => m.SubjectsPageComponent) },
      { path: 'projects',      loadComponent: () => import('./features/projects/pages/projects-page.component').then((m) => m.ProjectsPageComponent) },
      { path: 'collaboration', loadComponent: () => import('./features/groups/pages/groups-page.component').then((m) => m.GroupsPageComponent) },
      { path: 'analytics',     loadComponent: () => import('./features/analytics/pages/analytics-page.component').then((m) => m.AnalyticsPageComponent) },

      // ==================== ROUTE AJOUTÉE ====================
      {
        path: 'settings',
        loadComponent: () => 
          import('./features/settings/pages/settings-page.component')
            .then((m) => m.SettingsPageComponent)
      },
      // =======================================================

      
      { path: 'admin',       canActivate: [roleGuard(['admin'])], loadComponent: () => import('./features/admin/pages/admin-dashboard-page.component').then((m) => m.AdminDashboardPageComponent) },
      { path: 'admin/users', canActivate: [roleGuard(['admin'])], loadComponent: () => import('./features/admin/pages/admin-users-page.component').then((m) => m.AdminUsersPageComponent) },

      // Redirections
      { path: 'groups', redirectTo: 'collaboration', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];
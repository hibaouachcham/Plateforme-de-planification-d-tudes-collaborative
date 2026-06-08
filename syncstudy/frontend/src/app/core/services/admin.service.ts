import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { User } from '../models/user.model';
import { ToastService } from './toast.service';
import { API_PATHS } from '../api/api.constants';

export interface DashboardKPIs {
  // KPIs de base
  totalUsers:               number;
  activeUsers:              number;
  newUsersThisWeek:         number;
  totalSessions:            number;
  sessionsCreated:          number;   // alias compat
  completedSessions:        number;
  completionRate:           number;
  activeGroups:             number;
  avgGroupSize:             number;
  totalStudyHoursThisMonth: number;
  // Charts
  sessionsByStatus:   Record<string, number>;
  registrationsByDay: { day: string; count: number }[];
  topSubjects:        { name: string; count: number }[];
  usersByLevel:       Record<string, number>;
  hourlyActivity:     number[];
  // Utilisateurs récents
  recentUsers: {
    name:       string;
    school:     string;
    level:      string;
    initials:   string;
    minutesAgo: number;
  }[];
}

const EMPTY_KPIS: DashboardKPIs = {
  totalUsers: 0, activeUsers: 0, newUsersThisWeek: 0,
  totalSessions: 0, sessionsCreated: 0, completedSessions: 0,
  completionRate: 0, activeGroups: 0, avgGroupSize: 0,
  totalStudyHoursThisMonth: 0,
  sessionsByStatus: {}, registrationsByDay: [],
  topSubjects: [], usersByLevel: {}, hourlyActivity: [],
  recentUsers: [],
};

@Injectable({ providedIn: 'root' })
export class AdminService {
  private _users        = signal<User[]>([]);
  private _loading      = signal<boolean>(false);
  private _dashboardKPIs = signal<DashboardKPIs>(EMPTY_KPIS);

  readonly users        = this._users.asReadonly();
  readonly loading      = this._loading.asReadonly();
  readonly dashboardKPIs = this._dashboardKPIs.asReadonly();

  constructor(private toast: ToastService, private http: HttpClient) {}

  loadDashboard(): void {
    this.http.get<DashboardKPIs>(API_PATHS.adminDashboard).subscribe({
      next:  (data) => this._dashboardKPIs.set({ ...EMPTY_KPIS, ...data }),
      error: () => {
        this._dashboardKPIs.set({
          ...EMPTY_KPIS,
          activeUsers:    this._users().length,
          totalSessions:  0,
          sessionsCreated:0,
          activeGroups:   0,
        });
      },
    });
  }

  loadUsers(): void {
    this._loading.set(true);
    this.http.get<User[]>(API_PATHS.adminUsers).subscribe({
      next:  (data) => { this._users.set(data); this._loading.set(false); },
      error: ()     => this._loading.set(false),
    });
  }

  toggleStatus(userId: string): void {
    const user      = this._users().find((u) => u.id === userId);
    if (!user) return;
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    this.http.put<void>(API_PATHS.adminUserStatus(userId), { status: newStatus }).subscribe({
      next: () => {
        this._users.update((list) =>
          list.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
        );
        this.toast.show(
          `Compte ${newStatus === 'active' ? 'réactivé' : 'suspendu'} avec succès.`,
          'info'
        );
      },
      error: () => this.toast.show('Erreur lors de la modification du statut.', 'error'),
    });
  }

  createUser(payload: {
    name: string; email: string; password: string;
    school: string; level: string; role: string;
  }): Promise<User> {
    return new Promise((resolve, reject) => {
      this.http.post<User>(API_PATHS.adminUsers, payload).subscribe({
        next: (user) => {
          this._users.update((list) => [user, ...list]);
          resolve(user);
        },
        error: (err) => reject(err),
      });
    });
  }

  resetPassword(email: string): void {
    this.http.post<void>(`${API_PATHS.adminUsers}/reset-password`, { email }).subscribe({
      next:  () => this.toast.show(`Lien de réinitialisation envoyé à ${email}.`),
      error: () => this.toast.show(`Échec de réinitialisation pour ${email}.`, 'error'),
    });
  }

  deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(API_PATHS.adminUserDelete(userId)).pipe(
      tap(() => {
        this._users.update((list) => list.filter((u) => u.id !== userId));
        this.toast.show('Utilisateur supprimé avec succès.', 'info');
      })
    );
  }
}

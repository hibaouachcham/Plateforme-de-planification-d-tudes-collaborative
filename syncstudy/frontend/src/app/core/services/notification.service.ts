import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Notification, NotificationType } from '../models/user.model';
import { API_PATHS } from '../api/api.constants';

const TYPE_DEFAULTS: Record<
  NotificationType,
  { icon: string; colorClass: string }
> = {
  reminder: {
    icon: 'alarm',
    colorClass: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  },
  invitation: {
    icon: 'person_add',
    colorClass: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400',
  },
  achievement: {
    icon: 'military_tech',
    colorClass: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  },
  group_session: {
    icon: 'groups',
    colorClass: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  },
  // Admin notification types
  user_registered: {
    icon: 'how_to_reg',
    colorClass: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  },
  user_deleted: {
    icon: 'person_remove',
    colorClass: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',
  },
  user_suspended: {
    icon: 'block',
    colorClass: 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
  },
  user_reactivated: {
    icon: 'check_circle',
    colorClass: 'bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-400',
  },
  user_created: {
    icon: 'manage_accounts',
    colorClass: 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400',
  },
  password_reset: {
    icon: 'lock_reset',
    colorClass: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  },
};

export type PushNotificationInput = Omit<Notification, 'id' | 'isRead'> & { type: NotificationType };

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private _notifications = signal<Notification[]>([]);

  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount = computed(() => this._notifications().filter((n) => !n.isRead).length);
  readonly unreadNotifications = computed(() =>
    this._notifications().filter((n) => !n.isRead)
  );

  constructor(private http: HttpClient) {}

  markRead(id: string): void {
    this._notifications.update((list) =>
      list.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }

  markAllRead(): void {
    this._notifications.update((list) => list.map((n) => ({ ...n, isRead: true })));
  }

  push(input: PushNotificationInput): void {
    const def = TYPE_DEFAULTS[input.type];
    const n: Notification = {
      ...input,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      isRead: false,
      icon: input.icon || def.icon,
      colorClass: input.colorClass || def.colorClass,
    };
    this._notifications.update((list) => [n, ...list]);
  }

  loadNotifications(): void {
    this.http.get<Notification[]>(API_PATHS.notifications).subscribe({
      next: (data) => this._notifications.set(data),
      error: () => {},
    });
  }

  markReadHttp(id: string): void {
    this.markRead(id);
    this.http.put<void>(API_PATHS.notificationRead(id), {}).subscribe();
  }

  markAllReadHttp(): void {
    this.markAllRead();
    this.http.put<void>(API_PATHS.notificationsReadAll, {}).subscribe();
  }
}

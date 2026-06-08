import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NotificationService } from './notification.service';
import { Notification } from '../models/user.model';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;

  /** Crée une notification de test avec isRead = false par défaut */
  const makeNotif = (id: string, isRead = false): Notification => ({
    id,
    title: `Notification ${id}`,
    desc: 'Description',
    time: 'il y a 2 min',
    type: 'reminder',
    icon: 'alarm',
    colorClass: 'bg-amber-100 text-amber-600',
    isRead,
  });

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [NotificationService],
    });
    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('markRead sets notification as read', () => {
    // Alimenter le signal avec 2 notifications non lues
    (service as any)._notifications.set([makeNotif('1'), makeNotif('2')]);
    const before = service.unreadCount();
    expect(before).toBe(2);

    service.markRead('1');

    const n = service.notifications().find((x) => x.id === '1');
    expect(n?.isRead).toBe(true);
    expect(service.unreadCount()).toBeLessThan(before);
    expect(service.unreadCount()).toBe(1);
  });

  it('markAllRead clears unread count', () => {
    (service as any)._notifications.set([makeNotif('1'), makeNotif('2'), makeNotif('3')]);

    service.markAllRead();

    expect(service.unreadCount()).toBe(0);
    expect(service.notifications().every((n) => n.isRead)).toBe(true);
  });

  it('push prepends a typed notification with defaults', () => {
    // Signal vide au départ
    const len = service.notifications().length; // 0
    service.push({
      type: 'reminder',
      title: 'T',
      desc: 'D',
      time: 'now',
      icon: '',       // vide → service utilise le défaut du type
      colorClass: '', // vide → service utilise le défaut du type
    });

    expect(service.notifications().length).toBe(len + 1);
    const first = service.notifications()[0];
    expect(first.title).toBe('T');
    expect(first.type).toBe('reminder');
    expect(first.isRead).toBe(false);
    // TYPE_DEFAULTS.reminder.icon === 'alarm' (défini dans notification.service.ts)
    expect(first.icon).toBe('alarm');
  });
});

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, interval, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PlanningService } from '../../../core/services/planning.service';
import { CollaborationService } from '../../../core/services/collaboration.service';
import { Notification } from '../../../core/models/user.model';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <header class="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-3.5 flex items-center gap-4 sticky top-0 z-40">
      
      <div class="flex-1 max-w-md relative">
        <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-lg pointer-events-none" aria-hidden="true">search</span>
        <input 
          type="search" 
          [(ngModel)]="search" 
          (input)="onSearchInput()"
          (keydown.enter)="navigateToResult()"
          [placeholder]="isAdminArea() ? 'Rechercher un utilisateur (nom, e-mail, école...)' : 'Rechercher une session, un groupe...'"
          [attr.aria-label]="isAdminArea() ? 'Rechercher un utilisateur' : 'Rechercher des sessions, groupes ou matières'"
          autocomplete="off"
          class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 
                 rounded-xl pl-10 pr-4 py-2.5 text-sm
                 text-slate-700 dark:text-slate-200 
                 placeholder-slate-400 dark:placeholder-slate-500 
                 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent 
                 transition-all" 
        />

        @if (search.trim() && showResults()) {
          <div role="region" [attr.aria-label]="isAdminArea() ? 'Résultats utilisateurs' : 'Résultats de recherche'"
               class="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl
                      border border-slate-200 dark:border-slate-700 z-50 overflow-hidden max-h-80 overflow-y-auto fade-in">
            
            @if (isAdminArea()) {
              @if (matchedUsers().length) {
                <div class="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                  <p class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Utilisateurs</p>
                </div>
                @for (u of matchedUsers().slice(0, 6); track u.id) {
                  <button type="button" (click)="goToAdminUsersWithQuery(search.trim())"
                          [attr.aria-label]="'Filtrer la liste sur ' + u.name"
                          class="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left">
                    <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs font-black">
                      {{ u.name.charAt(0) }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-bold text-slate-900 dark:text-white truncate">{{ u.name }}</p>
                      <p class="text-xs text-slate-400 dark:text-slate-500 truncate">{{ u.email }}</p>
                    </div>
                    <span class="material-icons text-slate-300 dark:text-slate-600 text-sm" aria-hidden="true">chevron_right</span>
                  </button>
                }
              } @else {
                <div class="py-8 text-center">
                  <span class="material-icons text-3xl text-slate-200 dark:text-slate-700 block mb-2" aria-hidden="true">manage_accounts</span>
                  <p class="text-sm text-slate-400 dark:text-slate-500 font-medium">Aucun utilisateur pour "{{ search }}"</p>
                </div>
              }
            } @else {
              @if (matchedSessions().length) {
                <div class="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                  <p class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Sessions</p>
                </div>
                @for (s of matchedSessions().slice(0, 4); track s.id) {
                  <button type="button" (click)="goToSession(s.id)" 
                          [attr.aria-label]="'Ouvrir la session ' + getSubjectName(s.subjectId)"
                          class="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left">
                    <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                         [style.background]="getSubjectColor(s.subjectId) + '18'">
                      <span class="material-icons text-base" [style.color]="getSubjectColor(s.subjectId)" aria-hidden="true">schedule</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-bold text-slate-900 dark:text-white truncate">{{ getSubjectName(s.subjectId) }}</p>
                      <p class="text-xs text-slate-400 dark:text-slate-500">Session</p>
                    </div>
                    <span class="material-icons text-slate-300 dark:text-slate-600 text-sm" aria-hidden="true">chevron_right</span>
                  </button>
                }
              }

              @if (matchedGroups().length) {
                <div class="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700"
                     [class.border-t]="matchedSessions().length">
                  <p class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Groupes</p>
                </div>
                @for (g of matchedGroups().slice(0, 4); track g.id) {
                  <button type="button" (click)="goToGroups()"
                          [attr.aria-label]="'Voir le groupe ' + g.name"
                          class="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left">
                    <div [class]="'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs font-black ' + g.colorClass">
                      {{ g.name[0] }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-bold text-slate-900 dark:text-white truncate">{{ g.name }}</p>
                      <p class="text-xs text-slate-400 dark:text-slate-500">Groupe · {{ g.members }} membres</p>
                    </div>
                    <span class="material-icons text-slate-300 dark:text-slate-600 text-sm" aria-hidden="true">chevron_right</span>
                  </button>
                }
              }

              @if (matchedSubjects().length) {
                <div class="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700"
                     [class.border-t]="matchedSessions().length || matchedGroups().length">
                  <p class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Matières</p>
                </div>
                @for (s of matchedSubjects().slice(0, 4); track s.id) {
                  <button type="button" (click)="goToSubjects()"
                          [attr.aria-label]="'Voir la matière ' + s.name"
                          class="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left">
                    <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                         [style.background]="s.color + '18'">
                      <span class="material-icons text-base" [style.color]="s.color" aria-hidden="true">menu_book</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-bold text-slate-900 dark:text-white truncate">{{ s.name }}</p>
                      <p class="text-xs text-slate-400 dark:text-slate-500">Matière · {{ s.priority }}</p>
                    </div>
                    <span class="material-icons text-slate-300 dark:text-slate-600 text-sm" aria-hidden="true">chevron_right</span>
                  </button>
                }
              }

              @if (!matchedSessions().length && !matchedGroups().length && !matchedSubjects().length) {
                <div class="py-8 text-center">
                  <span class="material-icons text-3xl text-slate-200 dark:text-slate-700 block mb-2" aria-hidden="true">search_off</span>
                  <p class="text-sm text-slate-400 dark:text-slate-500 font-medium">Aucun résultat pour "{{ search }}"</p>
                </div>
              }
            }
          </div>
        }
      </div>

      <div class="flex items-center gap-3 ml-auto">
        
        <div class="relative" data-notif-root>
          <button 
            type="button"
            (click)="showNotif.set(!showNotif())"
            [attr.aria-expanded]="showNotif()"
            aria-haspopup="dialog"
            aria-controls="header-notif-panel"
            aria-label="Notifications"
            class="relative p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <span class="material-icons text-slate-500 dark:text-slate-400" aria-hidden="true">notifications</span>
            @if (notif.unreadCount() > 0) {
              <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full" aria-hidden="true"></span>
            }
          </button>

          @if (showNotif()) {
            <div id="header-notif-panel" role="dialog" aria-modal="true" aria-label="Notifications"
                 class="absolute right-0 top-12 w-96 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden fade-in">
              <!-- Header -->
              <div class="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <h4 class="font-black text-slate-900 dark:text-white" id="notif-heading">Notifications</h4>
                  @if (notif.unreadCount() > 0) {
                    <span class="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      {{ notif.unreadCount() }}
                    </span>
                  }
                </div>
                @if (notif.unreadCount() > 0) {
                  <button type="button" (click)="markAllReadAndPersist()"
                          aria-label="Marquer toutes les notifications comme lues"
                          class="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors">
                    Tout marquer lu
                  </button>
                }
              </div>

              @if (notif.unreadNotifications().length) {
                <div class="overflow-y-auto max-h-[28rem]">
                  @for (n of notif.unreadNotifications(); track n.id) {
                    <div (click)="openNotification(n)"
                         class="px-4 py-3.5 border-b border-slate-50 dark:border-slate-800 last:border-b-0
                                hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-all
                                bg-indigo-50/40 dark:bg-indigo-950/20">
                      <div class="flex gap-3">
                        <!-- Icon -->
                        <div [class]="'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ' + n.colorClass">
                          <span class="material-icons text-lg" aria-hidden="true">{{ n.icon }}</span>
                        </div>

                        <div class="flex-1 min-w-0">
                          <!-- Row 1: type badge + time + unread dot -->
                          <div class="flex items-center gap-1.5 mb-1">
                            <span [class]="'text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ' + typeBadgeClass(n.type)">
                              {{ typeLabel(n.type) }}
                            </span>
                            <span class="text-[10px] text-slate-400 dark:text-slate-500 ml-auto shrink-0">
                              {{ timeAgo(n.time) }}
                            </span>
                            <span class="w-2 h-2 bg-indigo-500 rounded-full shrink-0 flex-none" aria-hidden="true"></span>
                          </div>

                          <!-- Title -->
                          <p class="text-sm font-bold text-slate-900 dark:text-white leading-snug mb-0.5 line-clamp-1">
                            {{ n.title }}
                          </p>

                          <!-- Description -->
                          <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                            {{ n.desc }}
                          </p>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="h-44 flex flex-col items-center justify-center text-center px-6">
                  <span class="material-icons text-4xl text-slate-200 dark:text-slate-700 mb-2">notifications_none</span>
                  <p class="text-sm font-bold text-slate-400 dark:text-slate-500">Aucune nouvelle notification</p>
                  <p class="text-xs text-slate-300 dark:text-slate-600 mt-1">Vous êtes à jour !</p>
                </div>
              }
            </div>
          }
        </div>

        @if (selectedNotification(); as selected) {
          <div class="fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
               (click)="closeNotificationDetails()">
            <div role="dialog"
                 aria-modal="true"
                 aria-label="Détail de notification"
                 (click)="$event.stopPropagation()"
                 class="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">

              <!-- Colored header band -->
              <div [class]="'px-5 py-4 flex items-start justify-between gap-3 ' + notifHeaderBg(selected.type)">
                <div class="flex items-center gap-3">
                  <div [class]="'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-white/30 backdrop-blur-sm'">
                    <span class="material-icons text-2xl text-white" aria-hidden="true">{{ selected.icon }}</span>
                  </div>
                  <div>
                    <span class="text-[10px] font-black uppercase tracking-widest text-white/70">
                      {{ typeLabel(selected.type) }}
                    </span>
                    <h4 class="text-base font-black text-white leading-snug">{{ selected.title }}</h4>
                  </div>
                </div>
                <button type="button"
                        (click)="closeNotificationDetails()"
                        class="p-1.5 rounded-xl hover:bg-white/20 text-white transition-colors shrink-0">
                  <span class="material-icons text-xl">close</span>
                </button>
              </div>

              <!-- Body -->
              <div class="p-5 space-y-4">
                <!-- Timestamp -->
                <p class="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <span class="material-icons text-xs">access_time</span>
                  {{ timeAgo(selected.time) }} · {{ formatNotifTime(selected.time) }}
                </p>

                <!-- Main message -->
                <p class="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{{ selected.desc }}</p>

                <!-- Details lines -->
                @if (selected.details && selected.details !== selected.desc) {
                  <div class="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 space-y-2 border border-slate-100 dark:border-slate-700">
                    @for (line of selected.details.split('  ·  '); track line) {
                      <div class="flex items-start gap-2">
                        <span class="material-icons text-sm text-slate-400 dark:text-slate-500 mt-0.5 shrink-0">arrow_right</span>
                        <p class="text-sm text-slate-700 dark:text-slate-200 font-medium">{{ line }}</p>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Actions -->
              <div class="px-5 pb-5 flex flex-wrap gap-2 justify-end">
                @if (selected.type === 'invitation') {
                  <button type="button"
                          (click)="acceptInvitation(selected)"
                          class="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none">
                    <span class="material-icons text-base">check_circle</span>
                    Accepter l'invitation
                  </button>
                }
                @if (selected.type === 'reminder') {
                  <button type="button"
                          (click)="goToSessionFromNotification(selected)"
                          class="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 transition-all shadow-lg shadow-amber-100 dark:shadow-none">
                    <span class="material-icons text-base">play_circle</span>
                    Démarrer la session
                  </button>
                }
                @if (selected.type === 'group_session') {
                  <button type="button"
                          (click)="goToSessionFromNotification(selected)"
                          class="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all">
                    <span class="material-icons text-base">groups</span>
                    Voir la session
                  </button>
                }
                @if (isAdminNotifType(selected.type) && selected.referenceId) {
                  <button type="button"
                          (click)="goToUserFromNotification(selected)"
                          class="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none">
                    <span class="material-icons text-base">manage_accounts</span>
                    Voir l'utilisateur
                  </button>
                }
                <button type="button"
                        (click)="closeNotificationDetails()"
                        class="px-5 py-2.5 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                  Fermer
                </button>
              </div>
            </div>
          </div>
        }

        @if (auth.currentUser(); as user) {
          <a routerLink="/app/settings"
             class="flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl px-3 py-2 transition-all cursor-pointer">
            <div class="text-right hidden sm:block">
              <p class="text-sm font-bold text-slate-900 dark:text-white leading-tight">{{ user.name }}</p>
              <p class="text-xs text-slate-400 dark:text-slate-500">{{ user.level }}</p>
            </div>
            <img 
              [src]="'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (user.avatar ?? user.name)"
              class="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900 border border-slate-200 dark:border-slate-700" 
              [alt]="'Avatar de ' + user.name" 
            />
          </a>
        }
      </div>
    </header>
  `,
})
export class HeaderComponent {
  auth = inject(AuthService);
  notif = inject(NotificationService);
  planning = inject(PlanningService);
  collab = inject(CollaborationService);
  admin = inject(AdminService);
  toast = inject(ToastService);
  router = inject(Router);
  private host = inject(ElementRef<HTMLElement>);
  private destroyRef = inject(DestroyRef);
  private queryDebounced$ = new Subject<string>();

  search = '';
  showNotif = signal(false);
  selectedNotification = signal<Notification | null>(null);
  showResults = signal(false);
  debouncedSearch = signal('');
  /** Barre du haut : en admin, ne pas mélanger avec sessions/matières de l’étudiant */
  isAdminArea = signal(this.router.url.includes('/app/admin'));

  constructor() {
    this.queryDebounced$
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((q) => this.debouncedSearch.set(q));

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.isAdminArea.set(this.router.url.includes('/app/admin')));

    // Rafraîchir les notifications toutes les 30 secondes pour recevoir les rappels/succès
    interval(30_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.notif.loadNotifications());
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.showNotif() && !this.selectedNotification()) return;
    const root = this.host.nativeElement.querySelector('[data-notif-root]');
    const target = event.target as Node | null;
    if (root && target && root.contains(target)) return;
    this.showNotif.set(false);
    this.closeNotificationDetails();
  }

  matchedUsers = computed(() => {
    const q = this.debouncedSearch().toLowerCase().trim();
    if (!q) return [];
    return this.admin.users().filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.school.toLowerCase().includes(q) ||
        u.level.toLowerCase().includes(q)
    );
  });

  matchedSessions = computed(() => {
    const q = this.debouncedSearch().toLowerCase().trim();
    if (!q) return [];
    return this.planning.sessions().filter((s) => {
      const name = this.getSubjectName(s.subjectId).toLowerCase();
      const objectives = (s.objectives ?? []).join(' ').toLowerCase();
      return name.includes(q) || objectives.includes(q);
    });
  });

  matchedGroups = computed(() => {
    const q = this.debouncedSearch().toLowerCase().trim();
    if (!q) return [];
    return this.collab.groups().filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q)
    );
  });

  matchedSubjects = computed(() => {
    const q = this.debouncedSearch().toLowerCase().trim();
    if (!q) return [];
    return this.planning.subjects().filter((s) => s.name.toLowerCase().includes(q));
  });

  trackNotifId(_index: number, n: Notification): string {
    return n.id;
  }

  openNotification(n: Notification): void {
    this.notif.markReadHttp(n.id); // persiste côté backend
    this.selectedNotification.set(n);
  }

  markAllReadAndPersist(): void {
    this.notif.markAllReadHttp(); // marque comme lu + persiste
  }

  closeNotificationDetails(): void {
    this.selectedNotification.set(null);
  }

  acceptInvitation(n: Notification): void {
    const code = n.referenceId?.trim();
    if (!code) {
      this.toast.show("Code d'invitation introuvable pour cette notification.", 'warning');
      return;
    }
    this.collab.joinGroupByCode(code);
    this.notif.markReadHttp(n.id);
    this.closeNotificationDetails();
    this.showNotif.set(false);
    void this.router.navigate(['/app/groups']);
  }

  goToSessionFromNotification(n: Notification): void {
    this.notif.markReadHttp(n.id);
    this.closeNotificationDetails();
    this.showNotif.set(false);
    const sessionId = n.referenceId?.trim();
    if (sessionId) {
      void this.router.navigate(['/app/sessions/details', sessionId]);
    } else {
      void this.router.navigate(['/app/sessions']);
    }
  }

  // ── Helpers pour l'affichage des notifications ────────────────────

  typeLabel(type: string): string {
    const labels: Record<string, string> = {
      reminder:        'Rappel',
      invitation:      'Invitation',
      achievement:     'Succès',
      group_session:   'Session groupe',
      user_registered: 'Inscription',
      user_deleted:    'Suppression',
      user_suspended:  'Suspension',
      user_reactivated:'Réactivation',
      user_created:    'Nouveau compte',
      password_reset:  'Réinit. MDP',
    };
    return labels[type] ?? type;
  }

  typeBadgeClass(type: string): string {
    const map: Record<string, string> = {
      reminder:        'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
      invitation:      'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400',
      achievement:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
      group_session:   'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400',
      user_registered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
      user_deleted:    'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400',
      user_suspended:  'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400',
      user_reactivated:'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400',
      user_created:    'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400',
      password_reset:  'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400',
    };
    return map[type] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  }

  notifHeaderBg(type: string): string {
    const map: Record<string, string> = {
      reminder:        'bg-gradient-to-r from-amber-500 to-orange-500',
      invitation:      'bg-gradient-to-r from-indigo-500 to-violet-600',
      achievement:     'bg-gradient-to-r from-emerald-500 to-teal-600',
      group_session:   'bg-gradient-to-r from-blue-500 to-indigo-600',
      user_registered: 'bg-gradient-to-r from-emerald-500 to-teal-600',
      user_deleted:    'bg-gradient-to-r from-red-500 to-rose-600',
      user_suspended:  'bg-gradient-to-r from-orange-500 to-amber-600',
      user_reactivated:'bg-gradient-to-r from-teal-500 to-cyan-600',
      user_created:    'bg-gradient-to-r from-violet-500 to-purple-600',
      password_reset:  'bg-gradient-to-r from-blue-500 to-indigo-600',
    };
    return map[type] ?? 'bg-gradient-to-r from-slate-500 to-slate-700';
  }

  /** Vérifie si le type est une notification admin avec un utilisateur associé. */
  isAdminNotifType(type: string): boolean {
    return ['user_registered', 'user_suspended', 'user_reactivated', 'user_created', 'password_reset'].includes(type);
  }

  goToUserFromNotification(n: Notification): void {
    this.notif.markReadHttp(n.id);
    this.closeNotificationDetails();
    this.showNotif.set(false);
    const query = n.referenceId?.trim();
    void this.router.navigate(['/app/admin/users'], {
      queryParams: query ? { q: query } : {},
    });
  }

  timeAgo(timeStr: string): string {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1)   return 'À l\'instant';
    if (diffMin < 60)  return `Il y a ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24)    return `Il y a ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1)   return 'Hier';
    if (diffD < 7)     return `Il y a ${diffD} jours`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' });
  }

  formatNotifTime(timeStr: string): string {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  getSubjectName(id: string): string {
    return this.planning.subjects().find((s) => s.id === id)?.name ?? '—';
  }

  getSubjectColor(id: string): string {
    return this.planning.subjects().find((s) => s.id === id)?.color ?? '#6366f1';
  }

  onSearchInput(): void {
    this.queryDebounced$.next(this.search);
    this.showResults.set(this.search.trim().length > 0);
  }

  navigateToResult(): void {
    const raw = this.search.trim();
    const q = raw.toLowerCase();
    if (!q) return;

    if (this.isAdminArea()) {
      const users = this.filterAdminUsers(q);
      if (users.length) {
        this.goToAdminUsersWithQuery(raw);
      }
      return;
    }

    const sessions = this.planning.sessions().filter((s) => {
      const name = this.getSubjectName(s.subjectId).toLowerCase();
      const objectives = (s.objectives ?? []).join(' ').toLowerCase();
      return name.includes(q) || objectives.includes(q);
    });
    const groups = this.collab.groups().filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q)
    );
    const subjects = this.planning.subjects().filter((s) =>
      s.name.toLowerCase().includes(q)
    );
    if (sessions.length) {
      this.goToSession(sessions[0].id);
    } else if (groups.length) {
      this.goToGroups();
    } else if (subjects.length) {
      this.goToSubjects();
    }
  }

  private filterAdminUsers(q: string) {
    return this.admin.users().filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.school.toLowerCase().includes(q) ||
        u.level.toLowerCase().includes(q)
    );
  }

  goToAdminUsersWithQuery(query: string): void {
    const q = query.trim();
    this.clearSearch();
    void this.router.navigate(['/app/admin/users'], {
      queryParams: q ? { q } : {},
    });
  }

  clearSearch(): void {
    this.search = '';
    this.debouncedSearch.set('');
    this.queryDebounced$.next('');
    this.showResults.set(false);
  }

  goToSession(_id: string): void {
    this.clearSearch();
    this.router.navigate(['/app/sessions']);
  }

  goToGroups(): void {
    this.clearSearch();
    this.router.navigate(['/app/groups']);
  }

  goToSubjects(): void {
    this.clearSearch();
    this.router.navigate(['/app/subjects']);
  }
}

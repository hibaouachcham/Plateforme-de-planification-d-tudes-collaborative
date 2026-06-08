import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { PlanningService } from '../../../core/services/planning.service';

const STUDENT_NAV = [
  { label: 'PRINCIPAL',    items: [
    { label: 'Tableau de bord', icon: 'dashboard',      route: '/app/dashboard'      },
    { label: 'Planning',        icon: 'calendar_month', route: '/app/planning'       },
    { label: 'Disponibilités',  icon: 'event_available', route: '/app/availabilities' },
  ]},
  { label: 'ÉTUDES',       items: [
    { label: 'Sessions',  icon: 'schedule',  route: '/app/sessions' },
    { label: 'Matières',  icon: 'menu_book', route: '/app/subjects' },
    { label: 'Projets',   icon: 'build',     route: '/app/projects' },
  ]},
  { label: 'COLLABORATIF', items: [
    { label: 'Groupes', icon: 'group', route: '/app/collaboration' },
  ]},
  { label: 'ANALYSE & PLUS', items: [
    { label: 'Statistiques', icon: 'bar_chart', route: '/app/analytics' },
    { label: 'Paramètres',   icon: 'settings',  route: '/app/settings'  },
  ]},
];

const ADMIN_NAV = [
  { label: 'ADMINISTRATION', items: [
    { label: 'Dashboard Admin', icon: 'admin_panel_settings', route: '/app/admin'       },
    { label: 'Utilisateurs',    icon: 'manage_accounts',      route: '/app/admin/users' },
  ]},
];

@Component({
  selector: 'app-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="hidden lg:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 min-h-screen flex-shrink-0">
      
      <!-- Logo -->
      <div class="p-5 border-b border-slate-100 dark:border-slate-800">
        <div class="flex items-center gap-2.5">
          <div class="bg-indigo-600 p-2 rounded-xl">
            <span class="material-icons text-white text-xl">school</span>
          </div>
          <span class="text-xl font-black text-slate-900 dark:text-white">SyncStudy</span>
        </div>
      </div>

      <nav class="flex-1 px-3 py-4 overflow-y-auto space-y-5">
        @for (group of navGroups(); track group.label) {
          <div>
            <p class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 mb-2">
              {{ group.label }}
            </p>
            @for (item of group.items; track item.route) {
              <a [routerLink]="item.route"
                 routerLinkActive="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 font-bold"
                 [routerLinkActiveOptions]="{ exact: true }"
                 class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold
                        text-slate-600 dark:text-slate-300 
                        hover:bg-slate-50 dark:hover:bg-slate-800 
                        hover:text-slate-900 dark:hover:text-white 
                        transition-all mb-0.5">
                <span class="material-icons text-[20px]">{{ item.icon }}</span>
                {{ item.label }}
              </a>
            }
          </div>
        }

      </nav>

      <!-- Progression Semaine (étudiants uniquement) -->
      @if (!auth.isAdmin()) {
        <div class="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
          <p class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
            PROGRESSION SEMAINE
          </p>
          <div class="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-1.5">
            <div class="h-full bg-indigo-600 rounded-full transition-all" [style.width.%]="progressPct()"></div>
          </div>
          <p class="text-xs font-bold text-slate-500 dark:text-slate-400">
            {{ completedH() }}h / {{ totalH() }}h planifiées
          </p>
        </div>
      }

      <!-- Déconnexion -->
      <div class="px-3 pb-4">
        <button type="button" (click)="auth.logout()"
                aria-label="Se déconnecter"
                class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold 
                       text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition-all w-full">
          <span class="material-icons text-[20px]" aria-hidden="true">logout</span>Déconnexion
        </button>
      </div>
    </aside>

    <!-- Mobile Version -->
    <div class="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="bg-indigo-600 p-1.5 rounded-lg"><span class="material-icons text-white text-base">school</span></div>
        <span class="text-lg font-black text-slate-900 dark:text-white">SyncStudy</span>
      </div>
      <button type="button"
              (click)="mobileOpen.set(!mobileOpen())"
              [attr.aria-expanded]="mobileOpen()"
              aria-controls="mobile-nav-drawer"
              [attr.aria-label]="mobileOpen() ? 'Fermer le menu de navigation' : 'Ouvrir le menu de navigation'"
              class="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
        <span class="material-icons text-slate-600 dark:text-slate-300" aria-hidden="true">{{ mobileOpen() ? 'close' : 'menu' }}</span>
      </button>
    </div>

    @if (mobileOpen()) {
      <div class="lg:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" (click)="closeMobile()"></div>
      <div id="mobile-nav-drawer" class="lg:hidden fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] z-50 bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-r border-slate-100 dark:border-slate-800" role="dialog" aria-modal="true" aria-label="Menu de navigation">
        <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="bg-indigo-600 p-2 rounded-xl">
              <span class="material-icons text-white text-lg">school</span>
            </div>
            <span class="text-lg font-black text-slate-900 dark:text-white">Menu</span>
          </div>
          <button type="button" (click)="closeMobile()" class="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fermer le menu">
            <span class="material-icons text-slate-600 dark:text-slate-300">close</span>
          </button>
        </div>

        <nav class="flex-1 px-3 py-4 overflow-y-auto space-y-5">
          @for (group of navGroups(); track group.label) {
            <div>
              <p class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 mb-2">
                {{ group.label }}
              </p>
              @for (item of group.items; track item.route) {
                <a [routerLink]="item.route"
                   routerLinkActive="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 font-bold"
                   [routerLinkActiveOptions]="{ exact: true }"
                   (click)="closeMobile()"
                   class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold
                          text-slate-600 dark:text-slate-300 
                          hover:bg-slate-50 dark:hover:bg-slate-800 
                          hover:text-slate-900 dark:hover:text-white 
                          transition-all mb-0.5">
                  <span class="material-icons text-[20px]">{{ item.icon }}</span>
                  {{ item.label }}
                </a>
              }
            </div>
          }

        </nav>

        @if (!auth.isAdmin()) {
          <div class="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
            <p class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
              PROGRESSION SEMAINE
            </p>
            <div class="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-1.5">
              <div class="h-full bg-indigo-600 rounded-full transition-all" [style.width.%]="progressPct()"></div>
            </div>
            <p class="text-xs font-bold text-slate-500 dark:text-slate-400">
              {{ completedH() }}h / {{ totalH() }}h planifiées
            </p>
          </div>
        }

        <div class="px-3 pb-6 pt-2">
          <button type="button" (click)="auth.logout(); closeMobile()"
                  aria-label="Se déconnecter"
                  class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold 
                         text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition-all w-full">
            <span class="material-icons text-[20px]" aria-hidden="true">logout</span>Déconnexion
          </button>
        </div>
      </div>
    }
  `,
})
export class SidebarComponent {
  auth         = inject(AuthService);
  planning     = inject(PlanningService);
  mobileOpen   = signal(false);
  navGroups    = computed(() => this.auth.isAdmin() ? ADMIN_NAV : STUDENT_NAV);

  progressPct = computed(() => {
    const s = this.planning.sessions();
    if (!s.length) return 0;
    const done  = s.filter((x) => x.isCompleted).reduce((a, x) => a + this.dh(x), 0);
    const total = s.reduce((a, x) => a + this.dh(x), 0);
    return total ? Math.round((done / total) * 100) : 0;
  });

  completedH = computed(() => this.planning.sessions().filter((s) => s.isCompleted).reduce((a, s) => a + this.dh(s), 0).toFixed(0));
  totalH     = computed(() => this.planning.sessions().reduce((a, s) => a + this.dh(s), 0).toFixed(0));

  private dh(s: { startTime: Date; endTime: Date }): number {
    return (s.endTime.getTime() - s.startTime.getTime()) / 3_600_000;
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }
}
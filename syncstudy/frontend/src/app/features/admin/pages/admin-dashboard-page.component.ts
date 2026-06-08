import { Component, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-6 fade-in">

      <!-- ── En-tête ──────────────────────────────────────────────────────── -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-black text-slate-900 dark:text-white">Dashboard Admin</h1>
          <p class="text-slate-500 mt-1">Surveillez l'activité globale de SyncStudy.</p>
        </div>
        <button (click)="reload()"
                class="flex items-center gap-2 text-sm font-bold text-indigo-600
                       hover:text-indigo-700 transition-all">
          <span class="material-icons text-base" [class.animate-spin]="admin.loading()">refresh</span>
          Actualiser
        </button>
      </div>

      <!-- ── 5 KPI cards ──────────────────────────────────────────────────── -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">

        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200
                    dark:border-slate-700 shadow-sm col-span-1">
          <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-3">
            <span class="material-icons text-indigo-600 text-lg">group</span>
          </div>
          <p class="text-3xl font-black text-slate-900 dark:text-white">
            {{ admin.dashboardKPIs().activeUsers }}
          </p>
          <p class="text-xs font-black text-slate-500 uppercase tracking-wider mt-1">
            Utilisateurs actifs
          </p>
          @if (admin.dashboardKPIs().newUsersThisWeek > 0) {
            <p class="text-[11px] text-emerald-600 font-bold mt-1">
              +{{ admin.dashboardKPIs().newUsersThisWeek }} cette semaine
            </p>
          }
        </div>

        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200
                    dark:border-slate-700 shadow-sm col-span-1">
          <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
            <span class="material-icons text-emerald-600 text-lg">calendar_month</span>
          </div>
          <p class="text-3xl font-black text-slate-900 dark:text-white">
            {{ admin.dashboardKPIs().totalSessions }}
          </p>
          <p class="text-xs font-black text-slate-500 uppercase tracking-wider mt-1">
            Sessions créées
          </p>
          <p class="text-[11px] text-slate-400 mt-1">
            {{ admin.dashboardKPIs().completedSessions }} complétées
          </p>
        </div>

        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200
                    dark:border-slate-700 shadow-sm col-span-1">
          <div class="w-10 h-10 rounded-xl mb-3 flex items-center justify-center"
               [class]="completionRateBg()">
            <span class="material-icons text-lg" [class]="completionRateIcon()">
              {{ admin.dashboardKPIs().completionRate >= 70 ? 'trending_up' : 'trending_down' }}
            </span>
          </div>
          <p class="text-3xl font-black text-slate-900 dark:text-white">
            {{ admin.dashboardKPIs().completionRate }}%
          </p>
          <p class="text-xs font-black text-slate-500 uppercase tracking-wider mt-1">
            Taux de complétion
          </p>
          <div class="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all"
                 [style.width.%]="admin.dashboardKPIs().completionRate"
                 [class]="admin.dashboardKPIs().completionRate >= 70 ? 'bg-emerald-500' : 'bg-amber-400'">
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200
                    dark:border-slate-700 shadow-sm col-span-1">
          <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
            <span class="material-icons text-amber-600 text-lg">bolt</span>
          </div>
          <p class="text-3xl font-black text-slate-900 dark:text-white">
            {{ admin.dashboardKPIs().activeGroups }}
          </p>
          <p class="text-xs font-black text-slate-500 uppercase tracking-wider mt-1">
            Groupes actifs
          </p>
          @if (admin.dashboardKPIs().avgGroupSize > 0) {
            <p class="text-[11px] text-slate-400 mt-1">
              {{ admin.dashboardKPIs().avgGroupSize | number:'1.1-1' }} membres / groupe
            </p>
          }
        </div>

        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200
                    dark:border-slate-700 shadow-sm col-span-1">
          <div class="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
            <span class="material-icons text-purple-600 text-lg">schedule</span>
          </div>
          <p class="text-3xl font-black text-slate-900 dark:text-white">
            {{ admin.dashboardKPIs().totalStudyHoursThisMonth }}h
          </p>
          <p class="text-xs font-black text-slate-500 uppercase tracking-wider mt-1">
            Heures d'étude
          </p>
          <p class="text-[11px] text-slate-400 mt-1">ce mois-ci</p>
        </div>
      </div>

      <!-- ── Ligne 1 : Inscriptions 7j + Statut sessions ──────────────────── -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

        <!-- Inscriptions par jour -->
        <div class="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200
                    dark:border-slate-700 shadow-sm">
          <h3 class="text-sm font-black text-slate-500 uppercase tracking-wider mb-4">
            Inscriptions — 7 derniers jours
          </h3>
          @if (regBars().length === 0) {
            <p class="text-slate-400 text-sm text-center py-6">Aucune donnée</p>
          } @else {
            <div class="flex items-end gap-2" style="height: 90px;">
              @for (bar of regBars(); track bar.day) {
                <div class="flex-1 flex flex-col items-center gap-1">
                  <span class="text-[10px] font-bold text-indigo-600">
                    {{ bar.count > 0 ? bar.count : '' }}
                  </span>
                  <div class="w-full rounded-t-lg transition-all"
                       [style.height.px]="bar.heightPx"
                       [class]="bar.count > 0 ? 'bg-indigo-500' : 'bg-slate-100'">
                  </div>
                </div>
              }
            </div>
            <div class="flex gap-2 mt-2">
              @for (bar of regBars(); track bar.day) {
                <div class="flex-1 text-center text-[11px] text-slate-400">{{ bar.day }}</div>
              }
            </div>
          }
        </div>

        <!-- Statut des sessions -->
        <div class="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200
                    dark:border-slate-700 shadow-sm">
          <h3 class="text-sm font-black text-slate-500 uppercase tracking-wider mb-4">
            Statut des sessions
          </h3>
          <div class="flex items-center gap-6">
            <!-- SVG donut -->
            <svg viewBox="0 0 120 120" width="110" height="110" class="flex-shrink-0">
              <circle cx="60" cy="60" r="50" fill="none"
                      stroke="#f1f5f9" stroke-width="18"/>
              @for (seg of donutSegments(); track seg.key) {
                <circle cx="60" cy="60" r="50" fill="none"
                        [attr.stroke]="seg.color"
                        stroke-width="18"
                        [attr.stroke-dasharray]="seg.dash"
                        [attr.stroke-dashoffset]="seg.offset"
                        transform="rotate(-90 60 60)"
                        stroke-linecap="butt"/>
              }
              <text x="60" y="56" text-anchor="middle"
                    class="text-slate-900 dark:text-white"
                    style="font-size:18px; font-weight:700; fill: currentColor;">
                {{ admin.dashboardKPIs().completionRate }}%
              </text>
              <text x="60" y="70" text-anchor="middle"
                    style="font-size:9px; fill: #94a3b8;">complétées</text>
            </svg>
            <!-- Légende -->
            <div class="flex flex-col gap-2.5 flex-1">
              @for (seg of donutSegments(); track seg.key) {
                <div class="flex items-center gap-2">
                  <div class="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                       [style.background]="seg.color"></div>
                  <span class="text-xs text-slate-500 flex-1">{{ seg.label }}</span>
                  <span class="text-xs font-black text-slate-800 dark:text-slate-200">
                    {{ seg.pct }}%
                  </span>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- ── Ligne 2 : Top matières + Distribution niveaux ────────────────── -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

        <!-- Top matières -->
        <div class="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200
                    dark:border-slate-700 shadow-sm">
          <h3 class="text-sm font-black text-slate-500 uppercase tracking-wider mb-4">
            Top matières étudiées
          </h3>
          @if (subjectBars().length === 0) {
            <p class="text-slate-400 text-sm text-center py-6">Aucune session enregistrée</p>
          } @else {
            <div class="space-y-3">
              @for (s of subjectBars(); track s.name) {
                <div class="flex items-center gap-3">
                  <span class="text-xs text-slate-500 w-28 flex-shrink-0 truncate">{{ s.name }}</span>
                  <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full bg-indigo-500 rounded-full transition-all"
                         [style.width.%]="s.pct"></div>
                  </div>
                  <span class="text-xs font-bold text-slate-700 dark:text-slate-300 w-6 text-right">
                    {{ s.count }}
                  </span>
                </div>
              }
            </div>
          }
        </div>

        <!-- Distribution par niveau -->
        <div class="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200
                    dark:border-slate-700 shadow-sm">
          <h3 class="text-sm font-black text-slate-500 uppercase tracking-wider mb-4">
            Distribution par niveau
          </h3>
          @if (levelBars().length === 0) {
            <p class="text-slate-400 text-sm text-center py-6">Aucun utilisateur</p>
          } @else {
            <div class="space-y-3">
              @for (l of levelBars(); track l.level) {
                <div class="flex items-center gap-3">
                  <span class="text-xs text-slate-500 w-28 flex-shrink-0 truncate">{{ l.level }}</span>
                  <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full bg-emerald-500 rounded-full transition-all"
                         [style.width.%]="l.pct"></div>
                  </div>
                  <span class="text-xs font-bold text-slate-700 dark:text-slate-300 w-6 text-right">
                    {{ l.count }}
                  </span>
                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- ── Ligne 3 : Créneaux horaires ──────────────────────────────────── -->
      <div class="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200
                  dark:border-slate-700 shadow-sm">
        <h3 class="text-sm font-black text-slate-500 uppercase tracking-wider mb-4">
          Activité par créneau horaire
        </h3>
        @if (hourlyBars().length === 0) {
          <p class="text-slate-400 text-sm text-center py-4">Aucune donnée</p>
        } @else {
          <div class="flex items-end gap-[3px]" style="height: 70px;">
            @for (bar of hourlyBars(); track bar.hour) {
              <div class="flex-1 rounded-t transition-all cursor-default"
                   [style.height.px]="bar.heightPx"
                   [style.min-height.px]="bar.count > 0 ? 3 : 0"
                   [class]="barColor(bar.hour)"
                   [title]="bar.hour + 'h : ' + bar.count + ' session(s)'">
              </div>
            }
          </div>
          <div class="flex gap-[3px] mt-1.5">
            @for (bar of hourlyBars(); track bar.hour) {
              <div class="flex-1 text-center" style="font-size: 9px; color: #94a3b8;">
                {{ bar.label }}
              </div>
            }
          </div>
          <p class="text-xs text-slate-400 mt-2 text-center">
            Pic d'activité : {{ peakHour() }}h — {{ peakCount() }} session(s)
          </p>
        }
      </div>

      <!-- ── Ligne 4 : Derniers utilisateurs inscrits ─────────────────────── -->
      <div class="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200
                  dark:border-slate-700 shadow-sm">
        <div class="flex items-center justify-between mb-5">
          <h3 class="text-sm font-black text-slate-500 uppercase tracking-wider">
            Derniers utilisateurs inscrits
          </h3>
          <a routerLink="/app/admin/users"
             class="text-sm font-bold text-indigo-600 hover:underline flex items-center gap-1">
            Gérer les utilisateurs
            <span class="material-icons text-sm">arrow_forward</span>
          </a>
        </div>

        @if (admin.dashboardKPIs().recentUsers.length === 0) {
          <p class="text-slate-400 text-sm text-center py-4">Aucun utilisateur</p>
        } @else {
          <div class="space-y-1 divide-y divide-slate-50 dark:divide-slate-800">
            @for (u of admin.dashboardKPIs().recentUsers; track u.name) {
              <div class="flex items-center gap-4 py-3">
                <div class="w-9 h-9 rounded-full flex items-center justify-center
                            text-xs font-black flex-shrink-0"
                     [style.background]="avatarBg(u.initials)"
                     [style.color]="avatarFg(u.initials)">
                  {{ u.initials }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {{ u.name }}
                  </p>
                  <p class="text-xs text-slate-500 truncate">
                    {{ u.school }}{{ u.school && u.level ? ' · ' : '' }}{{ u.level }}
                  </p>
                </div>
                <span class="text-xs text-slate-400 flex-shrink-0">{{ formatAgo(u.minutesAgo) }}</span>
                <div class="w-2 h-2 rounded-full flex-shrink-0"
                     [class]="u.minutesAgo < 60 ? 'bg-emerald-400' : 'bg-slate-300'">
                </div>
              </div>
            }
          </div>
        }
      </div>

    </div>
  `,
})
export class AdminDashboardPageComponent implements OnInit {
  admin = inject(AdminService);

  // ── computed: donut SVG ──────────────────────────────────────────────────
  readonly donutSegments = computed(() => {
    const C        = 314.159;
    const byStatus = this.admin.dashboardKPIs().sessionsByStatus ?? {};
    const total    = Object.values(byStatus).reduce((a, b) => a + (b as number), 0) || 1;
    const frac     = (key: string) => ((byStatus[key] as number) || 0) / total;

    const fCompleted    = frac('completed');
    const fPlanned      = frac('planned');
    const fInProgress   = frac('in_progress');
    const fExpired      = frac('expired');
    const fUnscheduled  = frac('unscheduled');

    const lenC = fCompleted   * C;
    const lenP = fPlanned     * C;
    const lenI = fInProgress  * C;
    const lenE = fExpired     * C;
    const lenU = fUnscheduled * C;

    return [
      { key: 'completed',   label: 'Complétées',     color: '#1D9E75',
        pct: Math.round(fCompleted    * 100),
        dash: `${lenC.toFixed(2)} ${C}`, offset: '0' },
      { key: 'planned',     label: 'Planifiées',     color: '#378ADD',
        pct: Math.round(fPlanned      * 100),
        dash: `${lenP.toFixed(2)} ${C}`, offset: `${(-lenC).toFixed(2)}` },
      { key: 'in_progress', label: 'En cours',       color: '#EF9F27',
        pct: Math.round(fInProgress   * 100),
        dash: `${lenI.toFixed(2)} ${C}`, offset: `${(-(lenC + lenP)).toFixed(2)}` },
      { key: 'expired',     label: 'Expirées',       color: '#E24B4A',
        pct: Math.round(fExpired      * 100),
        dash: `${lenE.toFixed(2)} ${C}`, offset: `${(-(lenC + lenP + lenI)).toFixed(2)}` },
      { key: 'unscheduled', label: 'Non planifiées', color: '#F59E0B',
        pct: Math.round(fUnscheduled  * 100),
        dash: `${lenU.toFixed(2)} ${C}`, offset: `${(-(lenC + lenP + lenI + lenE)).toFixed(2)}` },
    ].filter(s => s.pct > 0);
  });

  // ── computed: barres inscriptions ────────────────────────────────────────
  readonly regBars = computed(() => {
    const days = this.admin.dashboardKPIs().registrationsByDay ?? [];
    const max  = Math.max(...(days as any[]).map((d: any) => d.count as number), 1);
    return (days as any[]).map((d: any) => ({
      day:      d.day as string,
      count:    d.count as number,
      heightPx: Math.round((d.count as number) / max * 72),
    }));
  });

  // ── computed: barres horaires ─────────────────────────────────────────────
  readonly hourlyBars = computed(() => {
    const hours = this.admin.dashboardKPIs().hourlyActivity ?? [];
    const max   = Math.max(...(hours as number[]), 1);
    return (hours as number[]).map((count, i) => ({
      hour:     i,
      count,
      heightPx: Math.round(count / max * 64),
      label:    i % 3 === 0 ? `${i}h` : '',
    }));
  });

  // ── computed: top matières ────────────────────────────────────────────────
  readonly subjectBars = computed(() => {
    const subjects = this.admin.dashboardKPIs().topSubjects ?? [];
    const max = Math.max(...(subjects as any[]).map((s: any) => s.count as number), 1);
    return (subjects as any[]).map((s: any) => ({
      name:  s.name  as string,
      count: s.count as number,
      pct:   Math.round((s.count as number) / max * 100),
    }));
  });

  // ── computed: niveaux ─────────────────────────────────────────────────────
  readonly levelBars = computed(() => {
    const lev = this.admin.dashboardKPIs().usersByLevel ?? {};
    const max = Math.max(...(Object.values(lev) as number[]), 1);
    return Object.entries(lev)
      .map(([level, count]) => ({
        level,
        count: count as number,
        pct:   Math.round((count as number) / max * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  });

  // ── computed: pic horaire ─────────────────────────────────────────────────
  readonly peakHour = computed(() => {
    const hours = this.admin.dashboardKPIs().hourlyActivity ?? [];
    if (!hours.length) return 0;
    return (hours as number[]).indexOf(Math.max(...(hours as number[])));
  });

  readonly peakCount = computed(() => {
    const hours = this.admin.dashboardKPIs().hourlyActivity ?? [];
    return Math.max(...(hours as number[]), 0);
  });

  // ── lifecycle ────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.admin.loadDashboard();
  }

  reload(): void {
    this.admin.loadDashboard();
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  completionRateBg(): string {
    return this.admin.dashboardKPIs().completionRate >= 70
      ? 'bg-emerald-50' : 'bg-amber-50';
  }

  completionRateIcon(): string {
    return this.admin.dashboardKPIs().completionRate >= 70
      ? 'text-emerald-600' : 'text-amber-500';
  }

  barColor(hour: number): string {
    if (hour >= 8 && hour <= 12)  return 'bg-indigo-500';
    if (hour >= 13 && hour <= 17) return 'bg-indigo-400';
    if (hour >= 18 && hour <= 22) return 'bg-indigo-600';
    return 'bg-slate-200';
  }

  formatAgo(minutes: number): string {
    if (minutes < 60)   return `il y a ${minutes} min`;
    if (minutes < 1440) return `il y a ${Math.round(minutes / 60)}h`;
    return `il y a ${Math.round(minutes / 1440)}j`;
  }

  private readonly AVATAR_COLORS = [
    { bg: '#EEEDFE', fg: '#534AB7' },
    { bg: '#E1F5EE', fg: '#0F6E56' },
    { bg: '#FAEEDA', fg: '#854F0B' },
    { bg: '#E6F1FB', fg: '#185FA5' },
    { bg: '#FAECE7', fg: '#993C1D' },
    { bg: '#F4C0D1', fg: '#72243E' },
  ];

  avatarBg(initials: string): string {
    const idx = (initials?.charCodeAt(0) ?? 0) % this.AVATAR_COLORS.length;
    return this.AVATAR_COLORS[idx].bg;
  }

  avatarFg(initials: string): string {
    const idx = (initials?.charCodeAt(0) ?? 0) % this.AVATAR_COLORS.length;
    return this.AVATAR_COLORS[idx].fg;
  }
}

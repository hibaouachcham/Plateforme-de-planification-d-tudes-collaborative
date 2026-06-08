import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { PlanningService } from '../../../core/services/planning.service';
import { CollaborationService } from '../../../core/services/collaboration.service';
import { AuthService } from '../../../core/services/auth.service';
import { AnalyticsService } from '../../analytics/services/analytics.service';
import { ToastService } from '../../../core/services/toast.service';
import { format, isToday, isTomorrow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, NgChartsModule],
  template: `
    <div class="space-y-8 fade-in">
      <!-- Header row -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-black text-slate-900 dark:text-white">
            Bonjour, {{ firstName() }} ! 👋
          </h1>
          <p class="text-slate-500 dark:text-slate-400 mt-1">Voici votre programme pour aujourd'hui.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Left col: matières + sessions -->
        <div class="lg:col-span-2 space-y-6">

          <!-- Matières Actuelles card -->
          <div class="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-5">Matières Actuelles</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              @for (s of planning.subjects(); track s.id) {
                <a routerLink="/app/subjects"
                   class="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-700
                          hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/30 
                          transition-all cursor-pointer group">
                  <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                       [style.background]="s.color + '18'">
                    <span class="material-icons text-xl" [style.color]="s.color">menu_book</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-bold text-slate-900 dark:text-white text-sm truncate">{{ s.name }}</p>
                    <div class="flex items-center gap-2 mt-0.5">
                      <span [class]="priorityBadge(s.priority)">{{ s.priority }}</span>
                      <span class="text-xs text-slate-400 dark:text-slate-500 font-medium">{{ s.weeklyGoalHours }}h / semaine</span>
                    </div>
                  </div>
                  <span class="material-icons text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 transition-all text-base">
                    chevron_right
                  </span>
                </a>
              }
            </div>
          </div>

          <!-- Sessions à venir -->
          <div class="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div class="flex items-center justify-between mb-5">
              <h3 class="text-lg font-bold text-slate-900 dark:text-white">Sessions à venir</h3>
              <a routerLink="/app/sessions"
                 class="text-sm font-bold text-indigo-600 hover:underline">Voir tout</a>
            </div>
            <div class="space-y-3">
              @for (s of upcomingSessions(); track s.id) {
                <div class="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800
                            hover:bg-indigo-50/40 dark:hover:bg-indigo-950/40 transition-all border border-transparent
                            hover:border-indigo-100 dark:hover:border-indigo-800 group">
                  <div class="w-1 h-12 rounded-full flex-shrink-0"
                       [style.background]="subjectColor(s.subjectId)"></div>
                  <div class="flex-1 min-w-0">
                    <p class="font-bold text-slate-900 dark:text-white text-sm">{{ subjectName(s.subjectId, s.title) }}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {{ formatSessionDate(s.startTime) }} · {{ formatDuration(s) }}
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    @if (s.isGroupSession) {
                      <span class="text-[10px] font-black bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full uppercase">
                        Groupe
                      </span>
                    }
                    <button (click)="startSession(s.id)"
                            [disabled]="!!planning.activeId() || isSessionInPast(s.endTime)"
                            class="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700
                                   transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            [title]="isSessionInPast(s.endTime) ? 'Session expirée' : 'Démarrer'">
                      <span class="material-icons text-sm">{{ isSessionInPast(s.endTime) ? 'event_busy' : 'play_arrow' }}</span>
                    </button>
                  </div>
                </div>
              } @empty {
                <div class="text-center py-10">
                  <span class="material-icons text-4xl text-slate-200 dark:text-slate-700 block mb-2">event_available</span>
                  <p class="text-sm text-slate-400 dark:text-slate-500 font-medium">
                    Aucune session planifiée.<br>
                    <a routerLink="/app/sessions" class="text-indigo-600 font-bold hover:underline">
                      Aller au Planning
                    </a>
                  </p>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Right col: statut + groupes actifs -->
        <div class="space-y-6">
          <!-- Statut actuel card -->
          <div class="bg-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-200">
            <p class="text-xs font-black text-indigo-200 uppercase tracking-widest mb-3">STATUT ACTUEL</p>
            <h3 class="text-2xl font-black mb-5 leading-tight">
              @if (completionPct() >= 80) {
                En avance sur vos objectifs !
              } @else if (completionPct() >= 50) {
                Dans les temps, continuez !
              } @else {
                Quelques efforts à faire !
              }
            </h3>
            <div class="flex items-center gap-4 mb-5">
              <div class="bg-white/20 p-3 rounded-2xl">
                <span class="material-icons text-2xl">bolt</span>
              </div>
              <div>
                <p class="text-4xl font-black">{{ completionPct() }}%</p>
                <p class="text-indigo-200 text-sm font-medium">Complétion hebdomadaire</p>
              </div>
            </div>
          </div>

          <!-- Statistiques Visuelles -->
          <div class="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div class="flex items-center justify-between mb-1">
              <h3 class="text-lg font-bold text-slate-900 dark:text-white">Répartition de l'effort</h3>
              <a routerLink="/app/analytics" class="text-sm font-bold text-indigo-600 hover:underline">Détails</a>
            </div>
            <p class="text-xs text-slate-400 dark:text-slate-500 mb-3">
              {{ donutHasCompleted() ? 'Heures terminées par matière & projet' : 'Heures planifiées par matière & projet' }}
            </p>
            @if (donutSubjects().length > 0) {
              <div class="flex justify-center my-2 h-36">
                <canvas baseChart
                  [data]="donutChartData()"
                  [options]="donutChartOptions"
                  type="doughnut">
                </canvas>
              </div>
              <!-- Légende -->
              <div class="space-y-1.5 mt-3">
                @for (s of donutSubjects(); track s.id) {
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2 min-w-0">
                      <div class="w-2.5 h-2.5 rounded-full shrink-0" [style.background]="s.color"></div>
                      <span class="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{{ s.name }}</span>
                    </div>
                    <span class="text-xs font-black text-slate-900 dark:text-white ml-2 shrink-0">
                      {{ donutHasCompleted() ? s.completedH.toFixed(1) : s.plannedH.toFixed(1) }}h
                    </span>
                  </div>
                }
              </div>
            } @else {
              <div class="flex flex-col items-center justify-center py-8 text-slate-300 dark:text-slate-600">
                <span class="material-icons text-4xl mb-2">pie_chart</span>
                <p class="text-xs text-slate-400 dark:text-slate-500">Aucune matière configurée</p>
              </div>
            }
          </div>

          <!-- Groupes Actifs card -->
          <div class="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-bold text-slate-900 dark:text-white">Groupes Actifs</h3>
              <a routerLink="/app/groups"
                 class="text-sm font-bold text-indigo-600 hover:underline">Voir tout</a>
            </div>
            <div class="space-y-3">
              @for (g of joinedGroups(); track g.id) {
                <div class="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                  <div [class]="'w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0 ' + g.colorClass">
                    {{ g.name[0] }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-bold text-slate-900 dark:text-white text-sm truncate">{{ g.name }}</p>
                    <p class="text-xs text-slate-400 dark:text-slate-500">{{ g.members }} membres · {{ g.lastActive }}</p>
                  </div>
                </div>
              } @empty {
                <p class="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
                  <a routerLink="/app/groups" class="text-indigo-600 font-bold hover:underline">
                    Rejoindre un groupe
                  </a>
                </p>
              }
            </div>
          </div>

          <!-- Weekly progress card -->
          <div class="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4">Progression Hebdo</h3>
            <div class="space-y-4">
              @for (s of planning.subjects(); track s.id) {
                <div>
                  <div class="flex items-center justify-between mb-1.5">
                    <span class="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{{ s.name }}</span>
                    <span class="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2 flex-shrink-0">
                      {{ completedHours(s.id) }}h / {{ s.weeklyGoalHours }}h <span class="font-normal text-slate-400 dark:text-slate-500 text-[10px]">(7j)</span>
                    </span>
                  </div>
                  <div class="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-500"
                         [style.width.%]="progressPct(s.id, s.weeklyGoalHours)"
                         [style.background]="s.color">
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DashboardPageComponent {
  planning = inject(PlanningService);
  collab   = inject(CollaborationService);
  auth     = inject(AuthService);
  analytics = inject(AnalyticsService);
  toast    = inject(ToastService);
  router   = inject(Router);

  firstName = computed(() => this.auth.currentUser()?.name.split(' ')[0] ?? 'Étudiant');

  joinedGroups = computed(() => this.collab.groups().filter((g) => g.isJoined));

  upcomingSessions = computed(() => {
    const now = new Date();
    return this.planning.sessions()
      .filter((s) => !s.isCompleted && new Date(s.endTime) >= now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 5);
  });

  /** Taux de complétion hebdomadaire = terminées / (terminées + expirées) cette semaine.
   *  Les sessions futures sont EXCLUES du dénominateur (comme dans la page Statistiques). */
  completionPct = computed(() => this.analytics.weekCompletionPct());

  subjectName(id: string, fallback?: string): string {
    return this.planning.subjects().find((s) => s.id === id)?.name ?? fallback ?? '—';
  }

  subjectColor(id: string): string {
    return this.planning.subjects().find((s) => s.id === id)?.color ?? '#6366f1';
  }

  /** Heures terminées sur les 7 derniers jours glissants pour une matière.
   *  Fenêtre glissante (pas lun-dim strict) pour éviter un reset brutal le lundi. */
  completedHours(id: string): string {
    const since = new Date();
    since.setDate(since.getDate() - 7);
    since.setHours(0, 0, 0, 0);

    const h = this.planning.sessions()
      .filter(s => s.subjectId === id && s.isCompleted)
      .filter(s => new Date(s.startTime).getTime() >= since.getTime())
      .reduce((a, s) => {
        const end   = new Date(s.endTime).getTime();
        const start = new Date(s.startTime).getTime();
        return a + Math.max(0, end - start) / 3_600_000;
      }, 0);
    return h.toFixed(1);
  }

  progressPct(id: string, goal: number): number {
    return Math.min(100, Math.round((parseFloat(this.completedHours(id)) / goal) * 100));
  }

  priorityBadge(p: string): string {
    const b = 'text-[10px] font-black uppercase px-2 py-0.5 rounded-full';
    return p === 'Haute'   ? `${b} bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400`
         : p === 'Moyenne' ? `${b} bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400`
         :                   `${b} bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400`;
  }

  formatSessionDate(d: Date): string {
    if (isToday(d))    return `Aujourd'hui · ${format(d, 'HH:mm')}`;
    if (isTomorrow(d)) return `Demain · ${format(d, 'HH:mm')}`;
    return format(d, 'EEE dd MMM · HH:mm', { locale: fr });
  }

  formatDuration(s: { startTime: Date; endTime: Date }): string {
    const h = (s.endTime.getTime() - s.startTime.getTime()) / 3_600_000;
    return h >= 1 ? `${h.toFixed(1)}h` : `${Math.round(h * 60)}min`;
  }

  generate(): void {
    const prefs = this.auth.currentUser()?.preferences;
    this.planning.generateScheduleHttp(prefs?.restDayIndices ?? []).subscribe({
      next: (short) => {
        if (short.length) {
          this.toast.show(
            'Brouillon créé. Certaines heures n’ont pas pu être planifiées : ' +
              short.map((s) => `${s.subjectName} (${s.hoursMissing}h)`).join(' · ') +
              '. Ajustez vos disponibilités ou validez depuis le Planning.',
            'warning'
          );
        } else {
          this.toast.show(
            'Planning généré en brouillon. Ouvrez la page Planning pour valider ou ajuster.',
            'success'
          );
        }
      },
      error: () => {
        const short = this.planning.generateSchedule(prefs?.restDayIndices ?? []);
        if (short.length) {
          this.toast.show(
            'Brouillon créé. Certaines heures n’ont pas pu être planifiées : ' +
              short.map((s) => `${s.subjectName} (${s.hoursMissing}h)`).join(' · ') +
              '. Ajustez vos disponibilités ou validez depuis le Planning.',
            'warning'
          );
        } else {
          this.toast.show(
            'Planning généré en brouillon. Ouvrez la page Planning pour valider ou ajuster.',
            'success'
          );
        }
      },
    });
  }

  isSessionInPast(endTime: Date): boolean {
    return new Date(endTime) < new Date();
  }

  startSession(id: string): void {
    this.planning.startSessionHttp(id);
    this.router.navigate(['/app/sessions/active', id]);
  }

  /** True si au moins une matière a des heures terminées (sinon on bascule sur plannedH). */
  readonly donutHasCompleted = computed(() =>
    this.analytics.subjectStats().some(s => s.completedH > 0)
  );

  /** Matières à afficher dans le donut (avec heures > 0). */
  readonly donutSubjects = computed(() => {
    const stats = this.analytics.subjectStats();
    return this.donutHasCompleted()
      ? stats.filter(s => s.completedH > 0)
      : stats.filter(s => s.plannedH > 0);
  });

  donutChartData = computed<ChartData<'doughnut'>>(() => {
    // N'afficher que les matières/projets avec des heures terminées (évite les segments vides).
    // Si aucune heure terminée → afficher les heures planifiées comme estimation.
    const stats    = this.analytics.subjectStats();
    const withH    = stats.filter(s => s.completedH > 0);
    const source   = withH.length > 0 ? withH : stats.filter(s => s.plannedH > 0);
    const getValue = (s: typeof stats[0]) => withH.length > 0 ? s.completedH : s.plannedH;
    return {
      labels: source.map(s => s.name),
      datasets: [
        {
          data: source.map(s => +getValue(s).toFixed(2)),
          backgroundColor: source.map(s => s.color || '#6366f1'),
          borderWidth: 0,
        }
      ]
    };
  });

  donutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    cutout: '70%'
  };
}
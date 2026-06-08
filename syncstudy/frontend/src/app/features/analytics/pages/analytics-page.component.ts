import { Component, inject, computed } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { AnalyticsService } from '../services/analytics.service';
import { PlanningService } from '../../../core/services/planning.service';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';

@Component({
  selector: 'app-analytics-page',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe, NgChartsModule],
  template: `
    <div class="space-y-8 fade-in">
      <div>
        <h1 class="text-3xl font-black text-slate-900 dark:text-white">Statistiques</h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">Suivez vos performances et votre productivité.</p>
      </div>

      <!-- ── KPIs ──────────────────────────────────────────────── -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-5">
        @for (kpi of kpis(); track kpi.label) {
          <div class="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
            <div class="flex items-center justify-between mb-4">
              <div [class]="'p-3 rounded-2xl ' + kpi.bg">
                <span [class]="'material-icons text-xl ' + kpi.color">{{ kpi.icon }}</span>
              </div>
              <span [class]="'text-xs font-bold text-right ' + (kpi.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500')">
                {{ kpi.trend }}
              </span>
            </div>
            <p class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{{ kpi.label }}</p>
            <p class="text-3xl font-black text-slate-900 dark:text-white mb-1">{{ kpi.value }}</p>
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-auto">{{ kpi.sub }}</p>
          </div>
        }
      </div>

      <!-- ── Résumé semaine courante ───────────────────────────── -->
      <div class="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-6 text-white">
        <p class="text-xs font-black uppercase tracking-widest text-white/70 mb-4">SEMAINE EN COURS</p>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p class="text-4xl font-black">{{ analytics.weekCompletedCount() }}</p>
            <p class="text-sm text-white/80 mt-1">✅ Terminées</p>
          </div>
          <div>
            <p class="text-4xl font-black">{{ analytics.weekExpiredCount() }}</p>
            <p class="text-sm text-white/80 mt-1">⏰ Expirées</p>
          </div>
          <div>
            <p class="text-4xl font-black">{{ analytics.weekUpcomingCount() }}</p>
            <p class="text-sm text-white/80 mt-1">📅 À venir</p>
          </div>
          <div>
            <p class="text-4xl font-black">{{ analytics.weekCompletionPct() }}<span class="text-2xl">%</span></p>
            <p class="text-sm text-white/80 mt-1">Taux (terminées / passées)</p>
            <div class="mt-2 h-2 bg-white/20 rounded-full overflow-hidden">
              <div class="h-full bg-white rounded-full transition-all duration-700"
                   [style.width.%]="analytics.weekCompletionPct()"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Graphiques principaux ─────────────────────────────── -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <!-- Activité 7 derniers jours (line) -->
        <div class="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
          <h3 class="text-xl font-bold text-slate-900 dark:text-white">Activité — 7 derniers jours</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Heures planifiées vs heures réalisées</p>
          <div class="flex-grow h-64 min-h-[250px]">
            <canvas baseChart
              [data]="lineChartData()"
              [options]="lineChartOptions"
              type="line">
            </canvas>
          </div>
        </div>

        <!-- Donut répartition par matière -->
        <div class="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">Répartition</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">Heures par matière terminée</p>
          @if (subjectsWithHours().length > 0) {
            <div class="flex justify-center my-4 h-40">
              <canvas baseChart
                [data]="donutChartData()"
                [options]="donutChartOptions"
                type="doughnut">
              </canvas>
            </div>
            <!-- Légende : seulement les matières avec des heures -->
            <div class="space-y-2 mt-4">
              @for (s of subjectsWithHours(); track s.id) {
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2 min-w-0">
                    <div class="w-3 h-3 rounded-full shrink-0" [style.background]="s.color"></div>
                    <span class="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{{ s.name }}</span>
                  </div>
                  <div class="flex items-center gap-2 ml-2 shrink-0">
                    <span class="text-sm font-black text-slate-900 dark:text-white">{{ fmtH(s.completedH) }}</span>
                    <span class="text-xs text-slate-400 dark:text-slate-500 w-10 text-right">{{ pct(s.completedH) }}%</span>
                  </div>
                </div>
              }
              <!-- Matières sans heures : affichage discret -->
              @if (subjectsWithoutHours().length > 0) {
                <div class="pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                  <p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Pas encore étudiées</p>
                  @for (s of subjectsWithoutHours(); track s.id) {
                    <div class="flex items-center justify-between py-0.5">
                      <div class="flex items-center gap-2 min-w-0">
                        <div class="w-2.5 h-2.5 rounded-full shrink-0 opacity-40" [style.background]="s.color"></div>
                        <span class="text-xs text-slate-400 dark:text-slate-500 truncate">{{ s.name }}</span>
                      </div>
                      <span class="text-xs text-slate-300 dark:text-slate-600 ml-2">—</span>
                    </div>
                  }
                </div>
              }
            </div>
          } @else {
            <div class="flex flex-col items-center justify-center h-48 text-slate-300 dark:text-slate-600">
              <span class="material-icons text-5xl mb-3">pie_chart</span>
              <p class="text-sm text-slate-400 dark:text-slate-500">Aucune session terminée</p>
              <p class="text-xs text-slate-300 dark:text-slate-600 mt-1">Terminez des sessions pour voir la répartition</p>
            </div>
          }
        </div>
      </div>

      <!-- ── Prévu vs Réalisé — 4 semaines (bar) ──────────────── -->
      <div class="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-1">Prévu vs Réalisé — 4 semaines</h3>
        <div class="flex flex-wrap items-center gap-4 mb-6">
          <p class="text-sm text-slate-500 dark:text-slate-400">Heures de sessions programmées vs heures de sessions effectivement terminées</p>
          <div class="flex items-center gap-3 ml-auto text-xs font-bold">
            <span class="flex items-center gap-1.5">
              <span class="inline-block w-3 h-3 rounded-sm bg-slate-300 dark:bg-slate-600"></span>
              <span class="text-slate-500 dark:text-slate-400">Planifié = total des sessions créées</span>
            </span>
            <span class="flex items-center gap-1.5">
              <span class="inline-block w-3 h-3 rounded-sm bg-indigo-500"></span>
              <span class="text-slate-500 dark:text-slate-400">Réalisé = sessions marquées terminées</span>
            </span>
          </div>
        </div>
        <div class="min-h-[260px]">
          <canvas baseChart
            [data]="weeklyBarChartData()"
            [options]="barChartOptions()"
            type="bar">
          </canvas>
        </div>
        <!-- Résumé semaine par semaine -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          @for (w of analytics.weeklyComparison(); track w.label) {
            <div class="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
              <p class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{{ w.label }}</p>
              <p class="text-[10px] text-slate-400 dark:text-slate-600 mb-3">{{ w.weekRange }}</p>
              <div class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <span class="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span class="inline-block w-2 h-2 rounded-sm bg-slate-300 dark:bg-slate-600 shrink-0"></span>
                    Programmées
                  </span>
                  <span class="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {{ w.plannedCount }} sess. · {{ fmtH(w.plannedH) }}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="flex items-center gap-1.5 text-xs text-indigo-500 dark:text-indigo-400">
                    <span class="inline-block w-2 h-2 rounded-sm bg-indigo-500 shrink-0"></span>
                    Terminées
                  </span>
                  <span class="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {{ w.completedCount }} sess. · {{ fmtH(w.completedH) }}
                  </span>
                </div>
                <!-- Barre de progression -->
                <div class="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div class="h-full bg-indigo-500 rounded-full transition-all duration-700"
                       [style.width.%]="w.plannedH > 0 ? (w.completedH / w.plannedH * 100) : 0"></div>
                </div>
                <p class="text-[10px] font-black text-right"
                   [class]="weekPct(w) >= 75 ? 'text-emerald-600 dark:text-emerald-400' : weekPct(w) > 0 ? 'text-amber-500' : 'text-slate-400'">
                  {{ weekPct(w) }}%
                </p>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- ── Progression par matière (tableau + barres) ────────── -->
      <div class="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-1">Progression par matière & projet</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Heures étudiées et taux de complétion</p>

        @if (analytics.subjectStats().length > 0) {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-slate-100 dark:border-slate-800">
                  <th class="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 pr-4">Matière</th>
                  <th class="text-right text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 px-4">Planifié</th>
                  <th class="text-right text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 px-4">Réalisé</th>
                  <th class="text-right text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 px-4">Sessions</th>
                  <th class="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 pl-4 min-w-[120px]">Progression</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50 dark:divide-slate-800/60">
                @for (s of analytics.subjectStats(); track s.id) {
                  <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td class="py-3 pr-4">
                      <div class="flex items-center gap-2">
                        <div class="w-3 h-3 rounded-full shrink-0" [style.background]="s.color"></div>
                        <span class="font-semibold text-slate-900 dark:text-white">{{ s.name }}</span>
                      </div>
                    </td>
                    <td class="py-3 px-4 text-right font-medium text-slate-500 dark:text-slate-400">{{ s.plannedH.toFixed(1) }}h</td>
                    <td class="py-3 px-4 text-right font-black text-slate-900 dark:text-white">{{ s.completedH.toFixed(1) }}h</td>
                    <td class="py-3 px-4 text-right text-slate-500 dark:text-slate-400">
                      <span class="font-bold text-indigo-600 dark:text-indigo-400">{{ s.completedCount }}</span>
                      /{{ s.sessionCount }}
                    </td>
                    <td class="py-3 pl-4">
                      <div class="flex items-center gap-2">
                        <div class="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div class="h-full rounded-full transition-all duration-700"
                               [style.width.%]="s.completionPct"
                               [style.background]="s.color"></div>
                        </div>
                        <span class="text-xs font-black w-10 text-right"
                              [class]="s.completionPct >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'">
                          {{ s.completionPct }}%
                        </span>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="flex flex-col items-center justify-center py-12 text-slate-300 dark:text-slate-600">
            <span class="material-icons text-5xl mb-3">bar_chart</span>
            <p class="text-slate-500 dark:text-slate-400 font-medium">Aucune matière avec des sessions</p>
          </div>
        }
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Heatmap 12 semaines -->
        <div class="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-1">Heatmap d'Activité</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-5">Intensité d'étude sur 12 semaines</p>
          <div class="flex gap-1 flex-wrap">
            @for (cell of heatmapCells(); track cell.date) {
              <div [class]="heatColor(cell.hours)"
                   [title]="cell.date + ' — ' + cell.hours.toFixed(1) + 'h'"
                   class="w-4 h-4 rounded-sm cursor-default transition-all hover:scale-125">
              </div>
            }
          </div>
          <div class="flex items-center gap-2 mt-4 text-xs text-slate-400 dark:text-slate-500">
            <span>Moins</span>
            <div class="w-4 h-4 rounded-sm bg-slate-100 dark:bg-slate-700"></div>
            <div class="w-4 h-4 rounded-sm bg-indigo-200"></div>
            <div class="w-4 h-4 rounded-sm bg-indigo-400"></div>
            <div class="w-4 h-4 rounded-sm bg-indigo-600"></div>
            <div class="w-4 h-4 rounded-sm bg-indigo-800"></div>
            <span>Plus</span>
          </div>
        </div>

        <!-- Streak + Badges -->
        <div class="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div class="flex items-center gap-4 mb-6 p-4 bg-amber-50 dark:bg-amber-950 rounded-2xl border border-amber-100 dark:border-amber-900">
            <span class="material-icons text-4xl text-amber-500">local_fire_department</span>
            <div>
              <p class="text-4xl font-black text-slate-900 dark:text-white">{{ analytics.streak() }}</p>
              <p class="text-sm text-slate-500 dark:text-slate-400 font-medium">jours consécutifs</p>
            </div>
          </div>
          <p class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
            Badges — {{ analytics.earnedBadgesCount() }}/{{ analytics.badges().length }} obtenus
          </p>
          <div class="grid grid-cols-2 gap-2">
            @for (b of analytics.badges(); track b.id) {
              <div [class]="b.earned
                ? 'p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-900 flex items-center gap-2'
                : 'p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center gap-2 opacity-40'"
                   [title]="b.description">
                <span [class]="'material-icons text-lg ' + (b.earned ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600')">
                  {{ b.icon }}
                </span>
                <div class="min-w-0">
                  <p class="text-xs font-bold text-slate-900 dark:text-white truncate">{{ b.label }}</p>
                  @if (b.earned) {
                    <p class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✓ Obtenu</p>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- ── Tableau des sessions récentes ─────────────────────── -->
      <div class="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-1">Historique des sessions</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">20 dernières sessions — planifié vs réalisé</p>

        @if (analytics.recentSessions().length > 0) {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-slate-100 dark:border-slate-800">
                  <th class="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 pr-4">Session</th>
                  <th class="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 px-4">Date</th>
                  <th class="text-right text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 px-4">Planifié</th>
                  <th class="text-right text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 px-4">Réalisé</th>
                  <th class="text-right text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 pl-4">Statut</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50 dark:divide-slate-800/60">
                @for (row of analytics.recentSessions(); track row.id) {
                  <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td class="py-3 pr-4">
                      <div class="flex items-center gap-2">
                        @if (row.isGroup) {
                          <span class="material-icons text-sm text-indigo-400">group</span>
                        }
                        <span class="font-semibold text-slate-900 dark:text-white">{{ row.name }}</span>
                      </div>
                    </td>
                    <td class="py-3 px-4 text-slate-500 dark:text-slate-400">
                      {{ row.date | date:'EEE dd MMM':'':'fr' }}
                    </td>
                    <td class="py-3 px-4 text-right text-slate-500 dark:text-slate-400">{{ fmtH(row.plannedH) }}</td>
                    <td class="py-3 px-4 text-right font-bold"
                        [class]="row.status === 'completed'
                          ? (row.actualH >= row.plannedH ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')
                          : 'text-slate-400'">
                      {{ row.status === 'completed' ? fmtH(row.actualH) : '—' }}
                    </td>
                    <td class="py-3 pl-4 text-right">
                      @if (row.status === 'completed') {
                        <span class="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider
                                     bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                          <span class="material-icons text-[10px]">check_circle</span> Terminée
                        </span>
                      } @else if (row.status === 'expired') {
                        <span class="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider
                                     bg-rose-50 dark:bg-rose-950/40 text-rose-400 dark:text-rose-500">
                          <span class="material-icons text-[10px]">error_outline</span> Expirée
                        </span>
                      } @else {
                        <span class="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider
                                     bg-sky-50 dark:bg-sky-950/40 text-sky-500 dark:text-sky-400">
                          <span class="material-icons text-[10px]">schedule</span> Planifiée
                        </span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="flex flex-col items-center justify-center py-12 text-slate-300 dark:text-slate-600">
            <span class="material-icons text-5xl mb-3">history</span>
            <p class="text-slate-500 dark:text-slate-400 font-medium">Aucune session passée</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class AnalyticsPageComponent {
  analytics = inject(AnalyticsService);
  planning  = inject(PlanningService);

  // ── KPIs ─────────────────────────────────────────────────────────────
  kpis = computed(() => {
    const trend    = this.analytics.hoursTrend();
    const weekPct  = this.analytics.weekCompletionPct();
    const upcoming = this.analytics.weekUpcomingCount();

    // Progression objectifs : moyenne du taux de complétion (matières + projets)
    const stats         = this.analytics.subjectStats();
    const avgGoalPct    = stats.length
      ? Math.round(stats.reduce((a, s) => a + s.completionPct, 0) / stats.length)
      : 0;
    const allSubjects   = this.planning.subjects();
    const coursesCount  = allSubjects.filter(s => (s.studyType ?? 'course') === 'course').length;
    const projectsCount = allSubjects.filter(s => s.studyType === 'project').length;
    const subLabel = [
      coursesCount  > 0 ? `${coursesCount} matière${coursesCount > 1 ? 's' : ''}`  : '',
      projectsCount > 0 ? `${projectsCount} projet${projectsCount > 1 ? 's' : ''}` : '',
    ].filter(Boolean).join(' & ') || '—';

    return [
      // ① Heures étudiées cette semaine — vs semaine précédente
      {
        label:    'HEURES CETTE SEMAINE',
        value:    this.fmtHTotalKpi(this.analytics.thisWeekStudiedH()),
        trend:    trend.label,
        positive: trend.positive,
        icon:     'schedule',
        bg:       'bg-indigo-50 dark:bg-indigo-950/50',
        color:    'text-indigo-600 dark:text-indigo-400',
        sub:      `Total : ${this.fmtHTotalKpi(this.analytics.totalStudiedH())}`,
      },
      // ② Taux de complétion — sessions passées terminées vs manquées
      {
        label:    'TAUX DE COMPLÉTION',
        value:    `${weekPct}%`,
        trend:    weekPct >= 75 ? 'Excellent' : weekPct >= 50 ? 'Bon' : weekPct > 0 ? 'À améliorer' : '—',
        positive: weekPct >= 50,
        icon:     'task_alt',
        bg:       'bg-emerald-50 dark:bg-emerald-950/50',
        color:    'text-emerald-600 dark:text-emerald-400',
        sub:      `✅ ${this.analytics.weekCompletedCount()} session(s) faite(s) · ⏰ ${this.analytics.weekExpiredCount()} session(s) manquée(s)`,
      },
      // ③ Progression objectifs — % moyen des goals hebdo par matière
      {
        label:    'PROGRESSION OBJECTIFS',
        value:    `${avgGoalPct}%`,
        trend:    avgGoalPct >= 100 ? '🏆 Atteint !' : `${100 - avgGoalPct}% restant`,
        positive: avgGoalPct >= 50,
        icon:     'track_changes',
        bg:       'bg-violet-50 dark:bg-violet-950/50',
        color:    'text-violet-600 dark:text-violet-400',
        sub:      `Sur ${subLabel}`,
      },
      // ④ Sessions à venir cette semaine — actionnable
      {
        label:    'SESSIONS À VENIR',
        value:    `${upcoming}`,
        trend:    upcoming === 0 ? 'Semaine terminée' : upcoming === 1 ? '1 session restante' : `${upcoming} restantes`,
        positive: upcoming > 0,
        icon:     'event_available',
        bg:       'bg-amber-50 dark:bg-amber-950/50',
        color:    'text-amber-600 dark:text-amber-400',
        sub:      upcoming > 0 ? 'Cette semaine' : 'Planifier la suivante',
      },
    ];
  });

  // ── Line chart : planifié vs réalisé 7 jours ─────────────────────────
  lineChartData = computed<ChartData<'line'>>(() => {
    const activity = this.analytics.dailyActivity();
    return {
      labels: activity.map(x => x.day),
      datasets: [
        {
          data:            activity.map(x => x.planned),
          label:           'Planifié',
          fill:            false,
          tension:         0.4,
          borderColor:     '#cbd5e1',
          backgroundColor: 'rgba(203, 213, 225, 0.15)',
          borderDash:      [5, 4],
          pointRadius:     3,
        },
        {
          data:            activity.map(x => x.hours),
          label:           'Réalisé',
          fill:            true,
          tension:         0.4,
          borderColor:     '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.15)',
          pointRadius:     4,
        },
      ]
    };
  });

  lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, ticks: { stepSize: 1 } }
    }
  };

  // ── Helpers donut ─────────────────────────────────────────────────────
  readonly subjectsWithHours    = computed(() => this.analytics.subjectStats().filter(s => s.completedH > 0));
  readonly subjectsWithoutHours = computed(() => this.analytics.subjectStats().filter(s => s.completedH === 0));

  readonly totalCompletedH = computed(() => this.subjectsWithHours().reduce((a, s) => a + s.completedH, 0));

  pct(h: number): number {
    const total = this.totalCompletedH();
    return total > 0 ? Math.round((h / total) * 100) : 0;
  }

  // ── Donut : répartition par matière ──────────────────────────────────
  donutChartData = computed<ChartData<'doughnut'>>(() => {
    const stats = this.subjectsWithHours();
    return {
      labels: stats.map(s => s.name),
      datasets: [{ data: stats.map(s => s.completedH), backgroundColor: stats.map(s => s.color || '#6366f1'), borderWidth: 0 }]
    };
  });

  donutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    cutout: '72%'
  };

  // ── Bar chart : Prévu vs Réalisé sur 4 semaines ──────────────────────
  weeklyBarChartData = computed<ChartData<'bar'>>(() => {
    const weeks = this.analytics.weeklyComparison();
    return {
      labels: weeks.map(w => w.label),
      datasets: [
        { label: '📅 Programmées (h)', data: weeks.map(w => +w.plannedH.toFixed(2)),   backgroundColor: '#cbd5e1', borderRadius: 6 },
        { label: '✅ Terminées (h)',   data: weeks.map(w => +w.completedH.toFixed(2)), backgroundColor: '#6366f1', borderRadius: 6 },
      ]
    };
  });

  barChartOptions = computed<ChartConfiguration['options']>(() => {
    const weeks = this.analytics.weeklyComparison();
    const self = this;
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 10, padding: 16 } },
        tooltip: {
          callbacks: {
            title: (items) => {
              const w = weeks[items[0]?.dataIndex ?? 0];
              return `${w?.label ?? ''} (${w?.weekRange ?? ''})`;
            },
            label: (item) => {
              const w = weeks[item.dataIndex];
              const h = item.parsed.y;
              const hStr = self.fmtH(h);
              if (item.datasetIndex === 0) {
                return `  Sessions programmées : ${w.plannedCount} session${w.plannedCount !== 1 ? 's' : ''} — ${hStr}`;
              } else {
                return `  Sessions terminées : ${w.completedCount} session${w.completedCount !== 1 ? 's' : ''} — ${hStr}`;
              }
            },
            footer: (items) => {
              const w = weeks[items[0]?.dataIndex ?? 0];
              if (!w) return '';
              const pct = w.plannedH > 0 ? Math.round((w.completedH / w.plannedH) * 100) : 0;
              return `Taux de réalisation : ${pct}%`;
            }
          },
          footerFont: { weight: 'bold' },
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            callback: (v) => `${v}h`
          }
        }
      }
    };
  });

  // ── Heatmap ───────────────────────────────────────────────────────────
  heatmapCells() {
    return Array.from({ length: 84 }, (_, d) => {
      const date = new Date();
      date.setDate(date.getDate() - (83 - d));
      const dateStr = date.toISOString().slice(0, 10);
      return { date: dateStr, hours: this.analytics.heatmapHoursForDate(date) };
    });
  }

  heatColor(hours: number): string {
    if (hours === 0) return 'bg-slate-100 dark:bg-slate-800';
    if (hours < 1)   return 'bg-indigo-200 dark:bg-indigo-800';
    if (hours < 2)   return 'bg-indigo-400';
    if (hours < 4)   return 'bg-indigo-600';
    return 'bg-indigo-800';
  }

  // ── Helper taux semaine ───────────────────────────────────────────────
  weekPct(w: { plannedH: number; completedH: number }): number {
    if (w.plannedH <= 0) return 0;
    return Math.min(100, Math.round((w.completedH / w.plannedH) * 100));
  }

  // ── Helper formatage ──────────────────────────────────────────────────

  /** Format pour les cellules du tableau (ex: 1h30, 45min, —) */
  fmtH(h: number): string {
    if (h <= 0) return '—';
    const totalSec = Math.round(h * 3600);
    if (totalSec < 60) return `${totalSec}s`;
    const totalMin = Math.round(h * 60);
    const hh = Math.floor(totalMin / 60);
    const mm = totalMin % 60;
    if (hh > 0 && mm > 0) return `${hh}h${String(mm).padStart(2, '0')}`;
    if (hh > 0) return `${hh}h`;
    return `${mm}min`;
  }

  /** Format pour le KPI principal — affiche minutes si < 1h */
  fmtHTotalKpi(h: number): string {
    if (h <= 0) return '0min';
    const totalSec = Math.round(h * 3600);
    if (totalSec < 60) return `${totalSec}s`;
    const totalMin = Math.round(h * 60);
    if (totalMin < 60) return `${totalMin}min`;
    const hh = Math.floor(totalMin / 60);
    const mm = totalMin % 60;
    return mm > 0 ? `${hh}h${String(mm).padStart(2, '0')}` : `${hh}h`;
  }
}

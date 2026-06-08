import { Injectable, inject, computed } from '@angular/core';
import {
  startOfDay, subDays, startOfWeek, endOfWeek,
  addDays, isSameDay, isWithinInterval, subWeeks,
} from 'date-fns';
import { PlanningService } from '../../../core/services/planning.service';
import { StudySession } from '../../../core/models/session.model';

export interface Badge {
  id:          string;
  label:       string;
  icon:        string;
  description: string;
  earned:      boolean;
}

export interface SubjectStat {
  id:            string;
  name:          string;
  color:         string;
  plannedH:      number;
  completedH:    number;
  goal:          number;
  completionPct: number;
  sessionCount:  number;
  completedCount: number;
}

export interface SessionRow {
  id:          string;
  name:        string;
  date:        Date;
  plannedH:    number;
  actualH:     number;
  status:      'completed' | 'planned' | 'expired';
  isGroup:     boolean;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private planning = inject(PlanningService);

  // ── Helpers ──────────────────────────────────────────────────────────
  /** Durée planifiée en heures */
  plannedHours(s: StudySession): number {
    if (!s.startTime || !s.endTime) return 0;
    return Math.max(0, (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 3_600_000);
  }

  /** Durée comptabilisée pour une session terminée.
   *
   *  Convention (alignée avec le tableau de bord) :
   *  → Pour les KPIs "Heures étudiées" on utilise la durée PLANIFIÉE de chaque session
   *    terminée (endTime − startTime). Cela correspond à ce que l'étudiant avait prévu
   *    et a accompli en marquant la session "Terminée".
   *
   *  → La durée réelle du timer (pausedElapsedSeconds) est conservée séparément
   *    pour les graphiques de détail (ratio réel/planifié).
   */
  studiedHours(s: StudySession): number {
    if (!s.isCompleted) return 0;
    // Durée planifiée = ce que l'étudiant avait prévu pour cette session
    return this.plannedHours(s);
  }

  /** Durée réellement mesurée par le timer (secondes → heures).
   *  Utilisée dans les graphiques Prévu vs Réalisé. */
  actualTimerHours(s: StudySession): number {
    const elapsed = (s as any).pausedElapsedSeconds as number | null | undefined;
    if (elapsed != null && elapsed > 0) return elapsed / 3_600;
    if (s.actualDurationMinutes != null && s.actualDurationMinutes > 0) return s.actualDurationMinutes / 60;
    if (s.actualStart && s.actualEnd) {
      return Math.max(0, (new Date(s.actualEnd).getTime() - new Date(s.actualStart).getTime()) / 3_600_000);
    }
    return this.plannedHours(s); // fallback : même valeur que plannedH
  }

  private studyDay(s: StudySession): Date {
    if (s.isCompleted && s.actualStart) return new Date(s.actualStart);
    return new Date(s.startTime);
  }

  private sessionName(s: StudySession): string {
    const sub = this.planning.subjects().find(x => x.id === s.subjectId);
    return sub?.name ?? (s as any).title ?? '—';
  }

  private isExpired(s: StudySession): boolean {
    if (s.isCompleted) return false;
    return new Date(s.endTime) < new Date();
  }

  // ── Streak ───────────────────────────────────────────────────────────
  readonly streak = computed(() => {
    const completed = this.planning.sessions()
      .filter((s) => s.isCompleted)
      .map((s) => startOfDay(this.studyDay(s)).getTime());
    const uniqueDays = [...new Set(completed)].sort((a, b) => b - a);

    let count = 0;
    let check = startOfDay(new Date()).getTime();

    for (const day of uniqueDays) {
      if (day === check) {
        count++;
        check = subDays(new Date(check), 1).getTime();
      } else if (day < check) {
        break;
      }
    }
    return count;
  });

  // ── Totaux ───────────────────────────────────────────────────────────
  readonly totalStudiedH = computed(() =>
    this.planning.sessions()
      .filter((s) => s.isCompleted)
      .reduce((a, s) => a + this.studiedHours(s), 0)
  );

  /** Heures étudiées la semaine courante (lun–dim) */
  readonly thisWeekStudiedH = computed(() => {
    const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
    const sunday = endOfWeek(new Date(), { weekStartsOn: 1 });
    return this.planning.sessions()
      .filter((s) => s.isCompleted && isWithinInterval(this.studyDay(s), { start: monday, end: sunday }))
      .reduce((a, s) => a + this.studiedHours(s), 0);
  });

  /** Heures étudiées la semaine précédente */
  readonly prevWeekStudiedH = computed(() => {
    const prevMonday = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
    const prevSunday = endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
    return this.planning.sessions()
      .filter((s) => s.isCompleted && isWithinInterval(this.studyDay(s), { start: prevMonday, end: prevSunday }))
      .reduce((a, s) => a + this.studiedHours(s), 0);
  });

  /** Tendance heures : % d'évolution semaine courante vs semaine précédente */
  readonly hoursTrend = computed(() => {
    const prev = this.prevWeekStudiedH();
    const curr = this.thisWeekStudiedH();
    if (prev === 0) return curr > 0 ? { label: 'Nouveau', positive: true } : { label: '—', positive: true };
    const pct = Math.round(((curr - prev) / prev) * 100);
    return { label: `${pct >= 0 ? '+' : ''}${pct}%`, positive: pct >= 0 };
  });

  // ── Sessions cette semaine : planifiées vs réalisées ─────────────────
  private weekInterval() {
    return {
      start: startOfWeek(new Date(), { weekStartsOn: 1 }),
      end:   endOfWeek(new Date(),   { weekStartsOn: 1 }),
    };
  }

  /** Toutes les sessions de la semaine (terminées + expirées + à venir) */
  readonly weekPlannedCount = computed(() => {
    const interval = this.weekInterval();
    return this.planning.sessions()
      .filter((s) => isWithinInterval(new Date(s.startTime), interval))
      .length;
  });

  /** Sessions terminées cette semaine */
  readonly weekCompletedCount = computed(() => {
    const interval = this.weekInterval();
    return this.planning.sessions()
      .filter((s) => s.isCompleted && isWithinInterval(new Date(s.startTime), interval))
      .length;
  });

  /** Sessions expirées (passées non terminées) cette semaine */
  readonly weekExpiredCount = computed(() => {
    const interval = this.weekInterval();
    return this.planning.sessions()
      .filter((s) => !s.isCompleted
        && isWithinInterval(new Date(s.startTime), interval)
        && new Date(s.endTime) < new Date())
      .length;
  });

  /** Sessions futures encore planifiées cette semaine */
  readonly weekUpcomingCount = computed(() => {
    const interval = this.weekInterval();
    return this.planning.sessions()
      .filter((s) => !s.isCompleted
        && isWithinInterval(new Date(s.startTime), interval)
        && new Date(s.endTime) >= new Date())
      .length;
  });

  /** Taux : terminées / (terminées + expirées) — exclut les sessions futures */
  readonly weekCompletionPct = computed(() => {
    const done    = this.weekCompletedCount();
    const expired = this.weekExpiredCount();
    const total   = done + expired;
    if (total === 0) return 0;
    return Math.round((done / total) * 100);
  });

  readonly weeklyCompletionPct = computed(() => this.weekCompletionPct());

  // ── Progression par matière ──────────────────────────────────────────
  readonly subjectStats = computed<SubjectStat[]>(() => {
    const sessions  = this.planning.sessions();
    const completed = sessions.filter((s) => s.isCompleted);

    return this.planning.subjects()
      .map((sub) => {
        const subSessions   = sessions.filter((s) => s.subjectId === sub.id);
        const subCompleted  = completed.filter((s) => s.subjectId === sub.id);
        const plannedH      = subSessions.reduce((a, s) => a + this.plannedHours(s), 0);
        const completedH    = subCompleted.reduce((a, s) => a + this.studiedHours(s), 0);
        // goal = weeklyGoalHours si défini, sinon total planifié
        const goal          = (sub.weeklyGoalHours && sub.weeklyGoalHours > 0) ? sub.weeklyGoalHours : plannedH;
        return {
          id: sub.id, name: sub.name, color: sub.color,
          plannedH, completedH, goal,
          completionPct: goal > 0 ? Math.min(100, Math.round((completedH / goal) * 100)) : 0,
          sessionCount:  subSessions.length,
          completedCount: subCompleted.length,
        };
      })
      .filter(s => s.sessionCount > 0 || s.plannedH > 0)
      .sort((a, b) => b.completedH - a.completedH);
  });

  // ── Activité journalière (7 derniers jours) ──────────────────────────
  readonly dailyActivity = computed(() => {
    const sessions = this.planning.sessions().filter((s) => s.isCompleted);
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const day   = subDays(today, 6 - i);
      const hours = sessions
        .filter((s) => isSameDay(this.studyDay(s), day))
        .reduce((a, s) => a + this.studiedHours(s), 0);
      const planned = this.planning.sessions()
        .filter((s) => isSameDay(new Date(s.startTime), day))
        .reduce((a, s) => a + this.plannedHours(s), 0);
      const labels = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
      return { day: labels[day.getDay()], hours, planned };
    });
  });

  // ── Comparaison 4 dernières semaines (Prévu vs Réalisé en heures) ────
  readonly weeklyComparison = computed(() => {
    return Array.from({ length: 4 }, (_, i) => {
      const refDate = subWeeks(new Date(), 3 - i);
      const monday  = startOfWeek(refDate, { weekStartsOn: 1 });
      const sunday  = endOfWeek(refDate, { weekStartsOn: 1 });
      const inWeek  = (s: StudySession) => isWithinInterval(new Date(s.startTime), { start: monday, end: sunday });
      const sessions = this.planning.sessions();
      const weekSessions   = sessions.filter(inWeek);
      const completedSess  = sessions.filter(s => s.isCompleted && inWeek(s));
      const plannedH   = weekSessions.reduce((a, s) => a + this.plannedHours(s), 0);
      const completedH = completedSess.reduce((a, s) => a + this.plannedHours(s), 0);
      const label = i === 3 ? 'Cette sem.' : i === 2 ? 'Sem. -1' : i === 1 ? 'Sem. -2' : 'Sem. -3';
      // Dates de la semaine pour l'affichage
      const weekStart = `${monday.getDate()}/${monday.getMonth() + 1}`;
      const weekEnd   = `${sunday.getDate()}/${sunday.getMonth() + 1}`;
      return {
        label, plannedH, completedH,
        plannedCount:   weekSessions.length,
        completedCount: completedSess.length,
        weekRange: `${weekStart} – ${weekEnd}`,
      };
    });
  });

  // ── Tableau des sessions récentes ────────────────────────────────────
  readonly recentSessions = computed<SessionRow[]>(() => {
    return this.planning.sessions()
      .filter(s => s.isCompleted || this.isExpired(s) || new Date(s.startTime) <= new Date())
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, 20)
      .map(s => ({
        id:       s.id,
        name:     this.sessionName(s),
        date:     new Date(s.startTime),
        plannedH: this.plannedHours(s),
        // Colonne "Réalisé" : durée réelle mesurée par le timer
        actualH:  this.actualTimerHours(s),
        status:   s.isCompleted ? 'completed' : (this.isExpired(s) ? 'expired' : 'planned') as any,
        isGroup:  !!(s as any).isGroupSession || !!(s as any).groupSession,
      }));
  });

  // ── Badges ───────────────────────────────────────────────────────────
  readonly badges = computed<Badge[]>(() => {
    const sessions  = this.planning.sessions();
    const completed = sessions.filter((s) => s.isCompleted);
    const totalH    = completed.reduce((a, s) => a + this.studiedHours(s), 0);
    const streak    = this.streak();
    const subjects  = this.planning.subjects();
    const allGoalsPct = subjects.map((sub) => {
      const h = completed.filter((s) => s.subjectId === sub.id).reduce((a, s) => a + this.studiedHours(s), 0);
      return sub.weeklyGoalHours ? h / sub.weeklyGoalHours : 0;
    });
    const allAt100 = allGoalsPct.every((p) => p >= 1) && allGoalsPct.length > 0;

    return [
      { id: 'first-session', label: 'Première Session',          icon: 'play_circle',           description: "Compléter votre première session d'étude.", earned: completed.length >= 1 },
      { id: 'first-week',    label: 'Semaine complète',          icon: 'calendar_month',         description: 'Étudier chaque jour pendant 7 jours.',      earned: streak >= 7 },
      { id: 'goal-100',      label: 'Objectifs 100%',            icon: 'military_tech',          description: 'Atteindre 100% des objectifs hebdomadaires.',earned: allAt100 },
      { id: 'marathon',      label: 'Marathon',                   icon: 'timer',                  description: "Accumuler 20 heures d'étude.",               earned: totalH >= 20 },
      { id: 'streak-3',      label: 'Série 3 jours',             icon: 'local_fire_department',  description: 'Étudier 3 jours consécutifs.',               earned: streak >= 3 },
      { id: 'streak-5',      label: 'Série 5 jours',             icon: 'whatshot',               description: 'Étudier 5 jours consécutifs.',               earned: streak >= 5 },
      { id: '5-sessions',    label: '5 Sessions',                icon: 'workspace_premium',      description: 'Compléter 5 sessions.',                      earned: completed.length >= 5 },
      { id: '10-sessions',   label: '10 Sessions',               icon: 'star',                   description: 'Compléter 10 sessions.',                     earned: completed.length >= 10 },
    ];
  });

  readonly earnedBadgesCount = computed(() => this.badges().filter((b) => b.earned).length);

  /** Heatmap : heures réalisées pour un jour calendaire */
  heatmapHoursForDate(d: Date): number {
    return this.planning
      .sessions()
      .filter((s) => s.isCompleted)
      .filter((s) => isSameDay(this.studyDay(s), d))
      .reduce((a, s) => a + this.studiedHours(s), 0);
  }
}

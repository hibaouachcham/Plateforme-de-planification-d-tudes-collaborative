import { Injectable } from '@angular/core';
import {
  addDays, addHours, areIntervalsOverlapping,
  startOfDay, startOfWeek,
} from 'date-fns';
import { Subject, Availability } from '../models/subject.model';
import { StudySession } from '../models/session.model';

const PRIORITY_MAP: Record<string, number> = { Haute: 3, Moyenne: 2, Basse: 1 };

export interface ScheduleGenerationResult {
  sessions: StudySession[];
  /** Heures non planifiées par matière (objectif restant) */
  unscheduledHours: Record<string, number>;
  /** Heures disponibles totales cette semaine */
  totalAvailableHours: number;
  /** Heures totales demandées */
  totalNeededHours: number;
}

@Injectable({ providedIn: 'root' })
export class SchedulerService {
  /**
   * Greedy scheduling (CDC §4.2.2) :
   * - Cours avant projets, puis priorité décroissante
   * - Chaque jour passé → reporté à la semaine prochaine
   * - Non-chevauchement strict, pauses 30 min
   * - Min/max session par matière
   */
  generateSchedule(
    subjects: Subject[],
    availabilities: Availability[],
    startDate: Date,
    existingSessions: StudySession[] = [],
    restDayIndices: number[] = []
  ): ScheduleGenerationResult {
    const sessions: StudySession[] = [];
    const unscheduledHours: Record<string, number> = {};

    const allSessions = () => [...existingSessions, ...sessions];

    /** True si [start, end] chevauche une session existante */
    const overlaps = (start: Date, end: Date): boolean =>
      allSessions().some((s) => {
        const sStart = s.startTime instanceof Date ? s.startTime : new Date(s.startTime);
        const sEnd   = s.endTime   instanceof Date ? s.endTime   : new Date(s.endTime);
        return areIntervalsOverlapping({ start, end }, { start: sStart, end: sEnd });
      });

    /**
     * Retourne la date de fin de la session qui bloque [start, end],
     * ou null si aucun chevauchement.
     * Utilisé pour sauter directement à la fin du bloc qui occupe le créneau.
     */
    const blockingEnd = (start: Date, end: Date): Date | null => {
      for (const s of allSessions()) {
        const sStart = s.startTime instanceof Date ? s.startTime : new Date(s.startTime);
        const sEnd   = s.endTime   instanceof Date ? s.endTime   : new Date(s.endTime);
        if (areIntervalsOverlapping({ start, end }, { start: sStart, end: sEnd })) {
          return sEnd;
        }
      }
      return null;
    };

    // Cours en premier, puis projets — dans chaque groupe, priorité décroissante
    const sorted = [...subjects].sort((a, b) => {
      const typeA = a.studyType === 'project' ? 1 : 0;
      const typeB = b.studyType === 'project' ? 1 : 0;
      if (typeA !== typeB) return typeA - typeB;
      return PRIORITY_MAP[b.priority] - PRIORITY_MAP[a.priority];
    });

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd   = addDays(weekStart, 7);

    // Calculer les heures déjà complétées par matière cette semaine
    const completedHoursMap: Record<string, number> = {};
    existingSessions
      .filter(s => s.isCompleted && s.startTime >= weekStart && s.startTime < weekEnd)
      .forEach(s => {
        const h = (s.endTime.getTime() - s.startTime.getTime()) / 3_600_000;
        completedHoursMap[s.subjectId] = (completedHoursMap[s.subjectId] ?? 0) + h;
      });

    for (const subject of sorted) {
      const maxSessionDurationHours = (subject.maxSessionMin ?? 120) / 60;
      const minSessionDurationHours = (subject.minSessionMin ?? 45) / 60;
      // Déduire les heures déjà complétées cette semaine
      const alreadyDone = completedHoursMap[subject.id] ?? 0;
      let hoursLeft = Math.max(0, subject.weeklyGoalHours - alreadyDone);
      if (hoursLeft <= 0) {
        unscheduledHours[subject.id] = 0;
        continue;
      }

      // Construire les créneaux pour chaque jour de la semaine
      // Si un jour est passé → le reporter à la semaine prochaine
      const daySlots: Array<Array<{ cursor: Date; end: Date }>> = [];

      for (let i = 0; i < 7; i++) {
        const dayThisWeek = addDays(weekStart, i);

        if (restDayIndices.includes(dayThisWeek.getDay())) {
          daySlots.push([]);
          continue;
        }

        const dayAvails = availabilities.filter((a) => a.dayOfWeek === dayThisWeek.getDay());
        if (!dayAvails.length) {
          daySlots.push([]);
          continue;
        }

        // Déterminer le jour cible : cette semaine ou la semaine prochaine
        let targetDay = dayThisWeek;
        if (dayThisWeek < startOfDay(now)) {
          // Jour entièrement passé → semaine prochaine
          targetDay = addDays(dayThisWeek, 7);
        } else if (dayThisWeek.toDateString() === now.toDateString()) {
          // Aujourd'hui : vérifier si au moins un créneau est encore disponible
          const hasRemainingSlot = dayAvails.some((a) => {
            const [eh, em] = a.endTime.split(':').map(Number);
            return addHours(startOfDay(dayThisWeek), eh + em / 60) > now;
          });
          if (!hasRemainingSlot) {
            targetDay = addDays(dayThisWeek, 7);
          }
        }

        const slots = dayAvails.map((a) => {
          const [sh, sm] = a.startTime.split(':').map(Number);
          const [eh, em] = a.endTime.split(':').map(Number);
          return {
            cursor: addHours(startOfDay(targetDay), sh + sm / 60),
            end:    addHours(startOfDay(targetDay), eh + em / 60),
          };
        });
        daySlots.push(slots);
      }

      // Trier par date du premier créneau pour respecter l'ordre chronologique
      const indexedSlots = daySlots
        .map((slots, i) => ({ slots, firstDate: slots[0]?.cursor ?? addDays(weekStart, i) }))
        .sort((a, b) => a.firstDate.getTime() - b.firstDate.getTime())
        .map(x => x.slots);

      // Placement Greedy — max 1 session par matière par jour par passe
      let progress = true;
      while (hoursLeft > minSessionDurationHours / 2 && progress) {
        progress = false;

        for (let dayIndex = 0; dayIndex < indexedSlots.length && hoursLeft > 0; dayIndex++) {
          const slots = indexedSlots[dayIndex] ?? [];
          let placedToday = false;

          for (const slot of slots) {
            while (slot.cursor < slot.end && hoursLeft > 0 && !placedToday) {
              const remainingInSlot = (slot.end.getTime() - slot.cursor.getTime()) / 3_600_000;
              if (remainingInSlot < minSessionDurationHours) break;

              const duration = Math.min(hoursLeft, maxSessionDurationHours, remainingInSlot);
              if (duration < minSessionDurationHours) break;

              const sessionEnd = addHours(slot.cursor, duration);
              const blocker = blockingEnd(slot.cursor, sessionEnd);
              if (!blocker) {
                // Aucun chevauchement → placer la session
                sessions.push({
                  id: Math.random().toString(36).substring(2, 9),
                  subjectId: subject.id,
                  startTime: new Date(slot.cursor),
                  endTime: new Date(sessionEnd),
                  isCompleted: false,
                  isGroupSession: subject.workMode === 'group',
                });
                hoursLeft -= duration;
                slot.cursor = addHours(sessionEnd, 0.5); // pause 30 min après la session
                placedToday = true;
                progress = true;
              } else {
                // Chevauchement détecté → sauter directement à la fin du bloc + pause 30 min
                // (évite de tester créneau par créneau à travers une session de 2h)
                slot.cursor = addHours(blocker, 0.5);
              }
            }
            if (placedToday) break;
          }
        }
      }

      unscheduledHours[subject.id] = Math.max(0, hoursLeft);
    }

    // Calcul des heures disponibles totales
    const totalAvailableHours = availabilities.reduce((total, a) => {
      const [sh, sm] = a.startTime.split(':').map(Number);
      const [eh, em] = a.endTime.split(':').map(Number);
      return total + (eh + em / 60) - (sh + sm / 60);
    }, 0);

    const totalNeededHours = subjects.reduce((t, s) => t + s.weeklyGoalHours, 0);

    return { sessions, unscheduledHours, totalAvailableHours, totalNeededHours };
  }
}

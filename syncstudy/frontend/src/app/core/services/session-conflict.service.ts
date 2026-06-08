import { Injectable } from '@angular/core';
import { areIntervalsOverlapping } from 'date-fns';
import { StudySession } from '../models/session.model';

@Injectable({ providedIn: 'root' })
export class SessionConflictService {
  /**
   * True if [start, end] overlaps any session other than excludeSessionId.
   * Robust against string dates (JSON from backend not yet converted).
   */
  hasConflict(
    sessions: StudySession[],
    excludeSessionId: string,
    start: Date,
    end: Date
  ): boolean {
    if (end <= start) return true;
    return sessions.some((s) => {
      if (s.id === excludeSessionId) return false;
      // Defensive: accept both Date objects and ISO strings
      const sStart = s.startTime instanceof Date ? s.startTime : new Date(s.startTime);
      const sEnd   = s.endTime   instanceof Date ? s.endTime   : new Date(s.endTime);
      if (isNaN(sStart.getTime()) || isNaN(sEnd.getTime())) return false;
      return areIntervalsOverlapping({ start, end }, { start: sStart, end: sEnd });
    });
  }

  /**
   * Returns all pairs of overlapping sessions in the list.
   * Used for visual warnings in the calendar.
   */
  findOverlaps(sessions: StudySession[]): Set<string> {
    const conflictIds = new Set<string>();
    for (let i = 0; i < sessions.length; i++) {
      for (let j = i + 1; j < sessions.length; j++) {
        const a = sessions[i];
        const b = sessions[j];
        const aStart = a.startTime instanceof Date ? a.startTime : new Date(a.startTime);
        const aEnd   = a.endTime   instanceof Date ? a.endTime   : new Date(a.endTime);
        const bStart = b.startTime instanceof Date ? b.startTime : new Date(b.startTime);
        const bEnd   = b.endTime   instanceof Date ? b.endTime   : new Date(b.endTime);
        if (areIntervalsOverlapping({ start: aStart, end: aEnd }, { start: bStart, end: bEnd })) {
          conflictIds.add(a.id);
          conflictIds.add(b.id);
        }
      }
    }
    return conflictIds;
  }
}

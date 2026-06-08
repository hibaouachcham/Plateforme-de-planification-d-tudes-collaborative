import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AnalyticsService } from './analytics.service';
import { PlanningService } from '../../../core/services/planning.service';
import { StudySession } from '../../../core/models/session.model';
import { Subject } from '../../../core/models/subject.model';

describe('AnalyticsService', () => {
  const sessionsSig = signal<StudySession[]>([]);
  const subjectsSig = signal<Subject[]>([]);

  beforeEach(() => {
    TestBed.resetTestingModule();
    sessionsSig.set([]);
    subjectsSig.set([]);
    TestBed.configureTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PlanningService,
          useValue: {
            sessions: sessionsSig.asReadonly(),
            subjects: subjectsSig.asReadonly(),
          },
        },
      ],
    });
  });

  /**
   * TEST 1 - totalStudiedH utilise la duree PLANIFIEE (endTime - startTime).
   * Convention : studiedHours() = plannedHours() = endTime - startTime
   * Donnees : startTime = 10:00, endTime = 11:00 -> planifie 1 h
   *           actualEnd = 11:30 (reel, ignore)
   * Attendu : totalStudiedH() = 1
   */
  it('totalStudiedH uses planned duration (endTime minus startTime)', () => {
    const start = new Date('2025-06-10T10:00:00');
    sessionsSig.set([
      {
        id: 's1',
        subjectId: 'sub1',
        startTime: start,
        endTime: new Date('2025-06-10T11:00:00'),
        isCompleted: true,
        actualStart: start,
        actualEnd: new Date('2025-06-10T11:30:00'),
      },
    ]);
    subjectsSig.set([
      {
        id: 'sub1',
        name: 'Math',
        color: '#000',
        priority: 'Haute',
        weeklyGoalHours: 10,
      },
    ]);
    const svc = TestBed.inject(AnalyticsService);
    // studiedHours() delegue a plannedHours() = 1 h (pas 1.5)
    expect(svc.totalStudiedH()).toBe(1);
  });

  /**
   * TEST 2 - subjectStats.completionPct = heures planifiees completees / objectif.
   * Donnees : session de 1 h planifiee, objectif = 4 h
   *           actualDurationMinutes = 120 (ignore par studiedHours)
   * Attendu : completedH = 1, completionPct = 25 %
   */
  it('subjectStats completionPct reflects planned completed hours vs goal', () => {
    sessionsSig.set([
      {
        id: 's1',
        subjectId: 'sub1',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3_600_000),
        isCompleted: true,
        actualDurationMinutes: 120,
      },
    ]);
    subjectsSig.set([
      {
        id: 'sub1',
        name: 'Math',
        color: '#000',
        priority: 'Moyenne',
        weeklyGoalHours: 4,
      },
    ]);
    const stats = TestBed.inject(AnalyticsService).subjectStats();
    expect(stats.length).toBe(1);
    // studiedHours = plannedHours = 1 h (pas actualDurationMinutes = 2 h)
    expect(stats[0].completedH).toBe(1);
    expect(stats[0].completionPct).toBe(25);
  });

  /**
   * TEST 3 - heatmapHoursForDate additionne les heures planifiees.
   * Donnees : startTime = d, endTime = d + 1 h -> planifie 1 h
   *           actualEnd = d + 2 h (ignore)
   * Attendu : heatmapHoursForDate(d) = 1
   */
  it('heatmapHoursForDate sums planned studied hours on that calendar day', () => {
    const d = new Date('2025-08-20T15:00:00Z');
    sessionsSig.set([
      {
        id: 's1',
        subjectId: 'sub1',
        startTime: d,
        endTime: new Date(d.getTime() + 3_600_000),
        isCompleted: true,
        actualStart: d,
        actualEnd: new Date(d.getTime() + 2 * 3_600_000),
      },
    ]);
    subjectsSig.set([]);
    const svc = TestBed.inject(AnalyticsService);
    const key = d.toISOString().slice(0, 10);
    // studiedHours = plannedHours = 1 h (pas 2 h)
    expect(svc.heatmapHoursForDate(new Date(key + 'T12:00:00Z'))).toBe(1);
  });
});

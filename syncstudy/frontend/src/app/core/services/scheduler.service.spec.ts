import { areIntervalsOverlapping, startOfWeek } from 'date-fns';
import { SchedulerService } from './scheduler.service';
import { Subject, Availability } from '../models/subject.model';
import { StudySession } from '../models/session.model';

describe('SchedulerService', () => {
  let svc: SchedulerService;

  beforeEach(() => {
    svc = new SchedulerService();
  });

  it('returns empty when no subjects', () => {
    const start = new Date(2025, 3, 7);
    const r = svc.generateSchedule([], [], start, [], []);
    expect(r.sessions.length).toBe(0);
    expect(Object.keys(r.unscheduledHours).length).toBe(0);
  });

  it('does not overlap existing sessions', () => {
    const startDate = new Date(2025, 3, 7);
    const monday = startDate;

    const subj: Subject = {
      id: 'math',
      name: 'Math',
      color: '#6366f1',
      priority: 'Haute',
      weeklyGoalHours: 4,
      minSessionMin: 45,
      maxSessionMin: 120,
    };

    const avail: Availability[] = [
      { dayOfWeek: monday.getDay(), startTime: '08:00', endTime: '20:00' },
    ];

    const { sessions: firstRun } = svc.generateSchedule(
      [subj],
      avail,
      startDate,
      [],
      []
    );
    expect(firstRun.length).toBeGreaterThan(0);
    const blocker = firstRun[0];
    const existing: StudySession[] = [
      {
        id: 'ex',
        subjectId: 'other',
        startTime: new Date(blocker.startTime),
        endTime: new Date(blocker.endTime),
        isCompleted: false,
      },
    ];

    const { sessions } = svc.generateSchedule(
      [subj],
      avail,
      startDate,
      existing,
      []
    );

    for (const s of sessions) {
      expect(
        areIntervalsOverlapping(
          { start: s.startTime, end: s.endTime },
          { start: existing[0].startTime, end: existing[0].endTime }
        )
      ).toBe(false);
    }
  });

  it('reports unscheduled hours when slot is too tight', () => {
    const startDate = new Date(2025, 3, 7);
    const weekStart = startOfWeek(startDate, { weekStartsOn: 1 });
    const monday = weekStart;

    const subj: Subject = {
      id: 'phy',
      name: 'Physique',
      color: '#22c55e',
      priority: 'Moyenne',
      weeklyGoalHours: 10,
      minSessionMin: 120,
      maxSessionMin: 120,
    };

    const avail: Availability[] = [
      { dayOfWeek: monday.getDay(), startTime: '10:00', endTime: '10:30' },
    ];

    const { sessions, unscheduledHours } = svc.generateSchedule(
      [subj],
      avail,
      startDate,
      [],
      []
    );

    expect(sessions.length).toBe(0);
    expect(unscheduledHours['phy']).toBeGreaterThan(0);
  });
});

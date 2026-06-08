import { SessionConflictService } from './session-conflict.service';
import { StudySession } from '../models/session.model';

describe('SessionConflictService', () => {
  let svc: SessionConflictService;

  const s = (id: string, start: Date, end: Date): StudySession => ({
    id,
    subjectId: 'sub',
    startTime: start,
    endTime: end,
    isCompleted: false,
  });

  beforeEach(() => {
    svc = new SessionConflictService();
  });

  it('returns true when end <= start', () => {
    const a = new Date('2025-04-07T10:00:00');
    const b = new Date('2025-04-07T09:00:00');
    expect(svc.hasConflict([], 'x', a, b)).toBe(true);
  });

  it('ignores excluded session id', () => {
    const start = new Date('2025-04-07T10:00:00');
    const end = new Date('2025-04-07T11:00:00');
    const sessions = [s('keep', start, end)];
    expect(svc.hasConflict(sessions, 'keep', start, end)).toBe(false);
  });

  it('detects overlapping interval', () => {
    const sessions = [s('1', new Date('2025-04-07T10:00:00'), new Date('2025-04-07T12:00:00'))];
    expect(
      svc.hasConflict(
        sessions,
        '2',
        new Date('2025-04-07T11:00:00'),
        new Date('2025-04-07T13:00:00')
      )
    ).toBe(true);
  });

  it('returns false when adjacent (no overlap)', () => {
    const sessions = [s('1', new Date('2025-04-07T10:00:00'), new Date('2025-04-07T11:00:00'))];
    expect(
      svc.hasConflict(
        sessions,
        '2',
        new Date('2025-04-07T11:00:00'),
        new Date('2025-04-07T12:00:00')
      )
    ).toBe(false);
  });
});

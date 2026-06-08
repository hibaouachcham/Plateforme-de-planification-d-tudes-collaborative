export type Priority = 'Basse' | 'Moyenne' | 'Haute';

export interface Subject {
  id: string;
  name: string;
  color: string;
  priority: Priority;
  weeklyGoalHours: number;
  studyType?: 'course' | 'project';
  /** Portée de travail : personnel/privé ou en groupe */
  workMode?: 'private' | 'group';
  /** Durée minimale d'une session (minutes), défaut CDC 45 */
  minSessionMin?: number;
  /** Durée maximale d'une session (minutes), défaut CDC 120 */
  maxSessionMin?: number;
}

export interface Availability {
  dayOfWeek: number; // 0–6, 0=Sunday
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
}

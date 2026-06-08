/** CDC : rôle étudiant = `student` (plus `user`). */
export type UserRole = 'admin' | 'student';
export type UserStatus = 'active' | 'suspended';

/** Préférences d’étude (CDC §4.1.1 — alignement futur API preferences JSONB) */
export interface StudyPreferences {
  /** Durée de session souhaitée (minutes), ex. 45 */
  preferredSessionMinutes?: number;
  /** Jours sans planification (0 = dimanche … 6 = samedi, convention JS) */
  restDayIndices?: number[];
  /** Activer les rappels de session (J-1 et 15 min avant). Défaut : true */
  pushNotifications?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  joinedDate: string;
  school: string;
  level: string;
  phone?: string;
  birthDate?: string;
  avatar?: string;
  preferences?: StudyPreferences;
  /** Nouveau compte: parcours guidé requis avant accès complet */
  onboardingCompleted?: boolean;
}

/** CDC §4.5.1 */
export type NotificationType =
  | 'reminder' | 'invitation' | 'achievement' | 'group_session'
  | 'user_registered' | 'user_deleted' | 'user_suspended' | 'user_reactivated'
  | 'user_created' | 'password_reset';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  desc: string;
  details?: string;
  time: string;
  icon: string;
  colorClass: string;
  isRead: boolean;
  /** sessionId (reminder) ou inviteCode (invitation) */
  referenceId?: string;
}

import { environment } from '@env/environment';

const root = environment.apiUrl.replace(/\/$/, '');

export const API_PATHS = {
  root,
  // Auth
  authLogin:           `${root}/auth/login`,
  authRegister:        `${root}/auth/register`,
  authRefresh:         `${root}/auth/refresh`,
  authForgotPassword:          `${root}/auth/forgot-password`,
  authResetPassword:           `${root}/auth/reset-password`,
  authResetPasswordDirect:     `${root}/auth/reset-password-direct`,
  authPasswordHint:            `${root}/auth/password-hint`,
  authLogout:          `${root}/auth/logout`,
  // Users
  usersMe:             `${root}/users/me`,
  usersMePassword:     `${root}/users/me/password`,
  // Admin
  adminUsers:          `${root}/admin/users`,
  adminDashboard:      `${root}/admin/dashboard`,
  adminUserStatus:     (id: string) => `${root}/admin/users/${id}/status`,
  adminUserResetPwd:   (id: string) => `${root}/admin/users/${id}/reset-password`,
  adminUserDelete:     (id: string) => `${root}/admin/users/${id}`,
  // Subjects
  subjects:            `${root}/subjects`,
  subject:             (id: string) => `${root}/subjects/${id}`,
  // Availabilities
  availabilities:      `${root}/availabilities`,
  availability:        (id: string) => `${root}/availabilities/${id}`,
  // Sessions
  sessions:            `${root}/sessions`,
  session:             (id: string) => `${root}/sessions/${id}`,
  sessionGenerate:     `${root}/sessions/generate`,
  sessionDrafts:       `${root}/sessions/drafts`,
  sessionDeduplicate:        `${root}/sessions/deduplicate`,
  sessionMigrateGroupSessions: `${root}/sessions/migrate-group-sessions`,
  sessionSyncGroupSessions:    `${root}/sessions/sync-group-sessions`,
  sessionStart:        (id: string) => `${root}/sessions/${id}/start`,
  sessionStop:         (id: string) => `${root}/sessions/${id}/stop`,
  sessionShare:        (id: string) => `${root}/sessions/${id}/share`,
  // Groups
  groups:              `${root}/groups`,
  groupJoin:           `${root}/groups/join`,
  groupInvite:         (id: string) => `${root}/groups/${id}/invite`,
  groupLeave:          (id: string) => `${root}/groups/${id}/leave`,
  groupMessages:       (id: string) => `${root}/groups/${id}/messages`,
  group:               (id: string) => `${root}/groups/${id}`,
  groupRemoveMember:   (groupId: string, userId: string) => `${root}/groups/${groupId}/members/${userId}`,
  // Notifications
  notifications:       `${root}/notifications`,
  notificationRead:    (id: string) => `${root}/notifications/${id}/read`,
  notificationsReadAll:`${root}/notifications/read-all`,
} as const;

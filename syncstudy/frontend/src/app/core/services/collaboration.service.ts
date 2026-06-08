import { Injectable, signal, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Group, ChatMessage } from '../models/group.model';
import { SocketService } from './socket.service';
import { ToastService } from './toast.service';
import { PlanningService } from './planning.service';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';
import { API_PATHS } from '../api/api.constants';
import { Subscription, interval } from 'rxjs';

function randomInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

@Injectable({ providedIn: 'root' })
export class CollaborationService {
  private _groups = signal<Group[]>([]);
  private _messages = signal<Record<string, ChatMessage[]>>({});
  private _online = signal<Record<string, string[]>>({});
  private _messagePollers = new Map<string, Subscription>();

  readonly groups = this._groups.asReadonly();
  readonly messages = this._messages.asReadonly();
  readonly online = this._online.asReadonly();

  private reloadGroups(): void {
    this.http.get<Group[]>(API_PATHS.groups).subscribe({
      next: (data) => this._groups.set(data),
      error: () => {},
    });
  }

  /** Méthode publique : force le rechargement depuis le backend */
  reload(): void {
    this.reloadGroups();
  }

  constructor(
    private socket: SocketService,
    private toast: ToastService,
    private planning: PlanningService,
    private notifications: NotificationService,
    private auth: AuthService,
    private http: HttpClient
  ) {
    // Surveille les changements d'utilisateur (login / logout / changement de compte)
    // Quand un utilisateur se connecte → recharger ses groupes depuis le backend
    // Quand il se déconnecte → vider la liste pour ne pas fuiter les données
    effect(() => {
      const user = this.auth.currentUser();
      if (user) {
        this.reloadGroups();
      } else {
        this._groups.set([]);
        this._messages.set({});
        this._online.set({});
      }
    }, { allowSignalWrites: true });

    this.socket.onMessageHistory().subscribe(({ groupId, messages }) => {
      const normalized = (messages ?? []).map((m) => this.normalizeChatMessage(m));
      this._messages.update((prev) => ({ ...prev, [groupId]: normalized }));
    });

    this.socket.onReceiveMessage().subscribe(({ groupId, message }) => {
      const normalized = this.normalizeChatMessage(message);
      this._messages.update((prev) => {
        const list = prev[groupId] ?? [];
        if (list.some((m) => m.id === normalized.id)) return prev;
        const withoutTmpEcho = list.filter(
          (m) => !(m.id.startsWith('tmp-') && m.senderId === normalized.senderId && m.text === normalized.text)
        );
        return { ...prev, [groupId]: [...withoutTmpEcho, normalized] };
      });
    });

    this.socket.onPresenceUpdate().subscribe(({ groupId, onlineSocketIds }) => {
      this._online.update((prev) => ({ ...prev, [groupId]: onlineSocketIds }));
    });

    this.socket.onNewSharedSession().subscribe((data: unknown) => {
      const d = data as {
        id: string;
        groupId: string;
        subjectId: string;
        startTime: string;
        endTime: string;
      };
      if (!d?.id || !d.subjectId || !d.startTime || !d.endTime) return;
      this.planning.mergeSharedSessionFromSocket({
        id: d.id,
        groupId: d.groupId,
        subjectId: d.subjectId,
        startTime: new Date(d.startTime),
        endTime: new Date(d.endTime),
      });
      this.notifications.push({
        type: 'reminder',
        title: 'Nouvelle session partagée',
        desc: 'Une session de groupe a été ajoutée au calendrier.',
        details: `Session #${d.id} · groupe ${d.groupId}`,
        time: 'À l’instant',
        icon: 'event',
        colorClass: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400',
        referenceId: d.id,
      });
      this.toast.show('Session partagée reçue (calendrier mis à jour).', 'info');
    });

    this.socket.onSharedSessionModified().subscribe((data: unknown) => {
      const d = data as { id: string; groupId: string; startTime: string; endTime: string };
      if (!d?.id || !d.startTime || !d.endTime) return;
      this.planning.mergeSharedSessionFromSocket({
        id: d.id,
        groupId: d.groupId,
        startTime: new Date(d.startTime),
        endTime: new Date(d.endTime),
      });
      this.notifications.push({
        type: 'reminder',
        title: 'Session partagée modifiée',
        desc: 'Les horaires d’une session de groupe ont changé.',
        details: `Session #${d.id} · groupe ${d.groupId}`,
        time: 'À l’instant',
        icon: 'edit_calendar',
        colorClass: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
        referenceId: d.id,
      });
      this.toast.show('Session partagée mise à jour.', 'info');
    });
  }

  joinGroup(id: string): void {
    const g = this._groups().find((x) => x.id === id);
    if (!g) return;
    if (g.isJoined) {
      this.toast.show('Vous êtes déjà membre de ce groupe.', 'info');
      return;
    }
    
    // Call backend API to join the group
    this.http.post<Group>(`${API_PATHS.groups}/${id}/join`, {}).subscribe({
      next: (updatedGroup) => {
        this._groups.update((list) =>
          list.map((group) => (group.id === id ? { ...updatedGroup, isJoined: true } : group))
        );
        this.toast.show(`Vous avez rejoint le groupe "${updatedGroup.name}".`, 'success');
      },
      error: () => {
        this.toast.show("Impossible de rejoindre ce groupe.", 'error');
      }
    });
  }

  /** Rejoindre la room Socket pour le chat (historique + présence). */
  enterChatRoom(groupId: string): void {
    const userId = this.auth.currentUser()?.id ?? '';
    if (!groupId || !userId) return;
    this.socket.connect();
    this.socket.joinGroup(groupId, userId);
    this._online.update((prev) => {
      const cur = prev[groupId] ?? [];
      if (cur.length > 0) return prev;
      return { ...prev, [groupId]: ['self'] };
    });

    // Fallback HTTP (le serveur socket peut être absent en dev)
    this.refreshMessagesHttp(groupId);
    this.startPollingMessages(groupId);
  }

  leaveChatRoom(groupId: string): void {
    if (!groupId) return;
    this.socket.leaveGroup(groupId);
    this.stopPollingMessages(groupId);
  }

  private normalizeChatMessage(m: ChatMessage): ChatMessage {
    const ts = (m as unknown as { timestamp?: unknown }).timestamp;
    const senderName = typeof m.senderName === 'string' && m.senderName.trim() ? m.senderName.trim() : 'Member';
    let timestamp = new Date().toISOString();
    if (typeof ts === 'string') {
      const d = new Date(ts);
      timestamp = isNaN(d.getTime()) ? ts : d.toISOString();
    }
    return { ...m, senderName, timestamp };
  }

  private refreshMessagesHttp(groupId: string): void {
    this.http.get<ChatMessage[]>(API_PATHS.groupMessages(groupId)).subscribe({
      next: (messages) => {
        const normalized = (messages ?? []).map((m) => this.normalizeChatMessage(m));
        this._messages.update((prev) => ({ ...prev, [groupId]: normalized }));
      },
      error: () => {
        /* best effort */
      },
    });
  }

  private startPollingMessages(groupId: string): void {
    if (this._messagePollers.has(groupId)) return;
    const sub = interval(3000).subscribe(() => this.refreshMessagesHttp(groupId));
    this._messagePollers.set(groupId, sub);
  }

  private stopPollingMessages(groupId: string): void {
    const sub = this._messagePollers.get(groupId);
    if (sub) sub.unsubscribe();
    this._messagePollers.delete(groupId);
  }

  joinGroupByCode(code: string): void {
    this.http.post<Group>(API_PATHS.groupJoin, { inviteCode: code.trim().toUpperCase() }).subscribe({
      next: (group) => {
        this._groups.update((list) => {
          const exists = list.find((g) => g.id === group.id);
          if (exists) return list.map((g) => (g.id === group.id ? group : g));
          return [...list, group];
        });
        this.reloadGroups();
        this.toast.show('Vous avez rejoint le groupe !');
      },
      error: (err) => {
        if (err.status === 404) this.toast.show("Code d'invitation invalide.", 'error');
        else if (err.status === 409) this.toast.show('Vous êtes déjà membre de ce groupe.', 'info');
        else this.toast.show('Erreur lors de la jonction du groupe.', 'error');
      },
    });
  }

  removeMember(groupId: string, targetUserId: string, targetName: string): void {
    this.http.delete<void>(API_PATHS.groupRemoveMember(groupId, targetUserId)).subscribe({
      next: () => {
        this._groups.update((list) =>
          list.map((g) => {
            if (g.id !== groupId) return g;
            return {
              ...g,
              members: Math.max(0, g.members - 1),
              memberDetails: (g.memberDetails ?? []).filter((m) => m.id !== targetUserId),
            };
          })
        );
        this.toast.show(`${targetName} a été retiré(e) du groupe.`, 'info');
        this.reloadGroups();
      },
      error: (err) => {
        if (err?.status === 403) {
          this.toast.show('Seul le propriétaire peut retirer des membres.', 'error');
        } else {
          this.toast.show('Erreur lors du retrait du membre.', 'error');
        }
      },
    });
  }

  leaveGroup(id: string): void {
    this.http.delete<void>(API_PATHS.groupLeave(id)).subscribe({
      next: () => {
        this._groups.update((list) => list.filter((g) => g.id !== id));
        this.socket.leaveGroup(id);
        this.reloadGroups();
        this.toast.show('Vous avez quitté le groupe.', 'info');
      },
      error: () => this.toast.show('Erreur lors de la sortie du groupe.', 'error'),
    });
  }

  inviteMemberByEmail(groupId: string, email: string, onDone?: () => void): void {
    this.http.post<void>(API_PATHS.groupInvite(groupId), { email: email.trim() }).subscribe({
      next: () => {
        this.toast.show(`Invitation envoyée à ${email}`, 'success');
        onDone?.(); // Fermer le modal uniquement après succès
      },
      error: (err) => {
        const body = err?.error;
        // HTTP 503 = SMTP non configuré → la notif in-app a quand même été créée
        if (err?.status === 503) {
          this.toast.show(
            "Invitation envoyée dans les notifications de l'utilisateur (email non disponible).",
            'warning'
          );
          onDone?.(); // Fermer : l'invitation est quand même parvenue via les notifs
          return;
        }
        // HTTP 403 = non propriétaire
        if (err?.status === 403) {
          this.toast.show("Seul le propriétaire du groupe peut envoyer des invitations.", 'error');
          return; // Ne pas fermer — permettre correction
        }
        // HTTP 404 = email non enregistré dans l'application
        if (err?.status === 404) {
          this.toast.show("Aucun compte SyncStudy n'est associé à cette adresse email.", 'error');
          return; // Ne pas fermer — permettre correction
        }
        // HTTP 409 = utilisateur déjà membre
        if (err?.status === 409) {
          this.toast.show('Cet utilisateur est déjà membre du groupe.', 'info');
          onDone?.(); // Fermer : pas d'action corrective nécessaire
          return;
        }
        const msg =
          (typeof body === 'string' && body.trim()) ||
          body?.detail ||
          body?.message ||
          body?.title ||
          `Échec d'envoi de l'invitation (HTTP ${err?.status ?? '?'})`;
        this.toast.show(String(msg), 'error');
        // Ne pas fermer en cas d'erreur inconnue — laisser l'utilisateur réessayer
      },
    });
  }

  dissolveGroup(id: string, userId: string): void {
    const g = this._groups().find((x) => x.id === id);
    if (!g) return;
    if (g.ownerId !== userId) {
      this.toast.show('Seul le propriétaire peut dissoudre le groupe.', 'error');
      return;
    }
    // Suppression locale immédiate pour une UX fluide
    this._groups.update((list) => list.filter((x) => x.id !== id));
    this.socket.leaveGroup(id);
    // Persistance en base
    this.http.delete<void>(`${API_PATHS.groups}/${id}`).subscribe({
      next: () => this.toast.show('Groupe dissous.', 'info'),
      error: () => {
        // Rollback local si le backend échoue
        this.reloadGroups();
        this.toast.show('Erreur lors de la dissolution du groupe.', 'error');
      },
    });
  }

  createGroup(name: string, description: string, colorClass: string, ownerId: string): void {
    this.http.post<Group>(API_PATHS.groups, { name, description, colorClass, ownerId }).subscribe({
      next: (group) => {
        this._groups.update((list) => [...list, group]);
        this.reloadGroups();
        this.toast.show('Groupe créé !');
      },
      error: () => this.toast.show('Erreur lors de la création du groupe.', 'error'),
    });
  }

  isOwner(g: Group, userId: string | undefined): boolean {
    return !!userId && g.ownerId === userId;
  }

  updateGroupLocally(updated: Partial<Group> & { id: string }): void {
    this._groups.update(list =>
      list.map(g => g.id === updated.id ? { ...g, ...updated } : g)
    );
  }

  sendMessage(groupId: string, senderName: string, text: string): void {
    const senderId = this.auth.currentUser()?.id ?? 'anonymous';
    const msg: Omit<ChatMessage, 'id'> = {
      senderId,
      senderName,
      text,
      timestamp: new Date().toISOString(),
    };
    const tmpId = `tmp-${Date.now()}`;
    const local: ChatMessage = { ...msg, id: tmpId };
    this._messages.update((prev) => ({
      ...prev,
      [groupId]: [...(prev[groupId] ?? []), local],
    }));

    if (this.socket.isConnected()) {
      this.socket.sendMessage(groupId, msg);
      return;
    }

    // Fallback HTTP si socket indisponible.
    this.http.post<ChatMessage>(API_PATHS.groupMessages(groupId), { text }).subscribe({
      next: (saved) => {
        const normalized = this.normalizeChatMessage(saved);
        this._messages.update((prev) => {
          const list = prev[groupId] ?? [];
          const withoutTmp = list.filter((m) => m.id !== tmpId);
          if (withoutTmp.some((m) => m.id === normalized.id)) return prev;
          return { ...prev, [groupId]: [...withoutTmp, normalized] };
        });
      },
      error: () => {
        // On garde le message local mais on tente un refresh
        this.refreshMessagesHttp(groupId);
      },
    });
  }

  getMessages(groupId: string): ChatMessage[] {
    return this._messages()[groupId] ?? [];
  }

  getOnlineCount(groupId: string): number {
    return (this._online()[groupId] ?? []).length;
  }
}

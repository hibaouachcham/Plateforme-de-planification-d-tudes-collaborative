import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { ChatMessage } from '../models/group.model';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: Socket;
  private destroy$ = new Subject<void>();

  constructor() {
    this.socket = io(environment.socketUrl, { autoConnect: false });
  }

  connect(): void {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  isConnected(): boolean {
    return this.socket.connected;
  }

  disconnect(): void {
    this.socket.disconnect();
  }

  // ── Group presence ──────────────────────────────────────────────
  joinGroup(groupId: string, userId: string): void {
    this.socket.emit('join-group', { groupId, userId });
  }

  leaveGroup(groupId: string): void {
    this.socket.emit('leave-group', { groupId });
  }

  onPresenceUpdate(): Observable<{ groupId: string; onlineSocketIds: string[] }> {
    return new Observable((obs) => {
      this.socket.on(
        'presence-update',
        (data: { groupId: string; onlineSocketIds: string[] }) => obs.next(data)
      );
    });
  }

  // ── Messaging ───────────────────────────────────────────────────
  sendMessage(groupId: string, message: Omit<ChatMessage, 'id'>): void {
    this.socket.emit('send-message', { groupId, message });
  }

  onMessageHistory(): Observable<{ groupId: string; messages: ChatMessage[] }> {
    return new Observable((obs) => {
      this.socket.on(
        'message-history',
        (data: { groupId: string; messages: ChatMessage[] }) => obs.next(data)
      );
    });
  }

  onReceiveMessage(): Observable<{ groupId: string; message: ChatMessage }> {
    return new Observable((obs) => {
      this.socket.on(
        'receive-message',
        (data: { groupId: string; message: ChatMessage }) => obs.next(data)
      );
    });
  }

  // ── Sessions ─────────────────────────────────────────────────────
  emitSharedSessionCreated(session: unknown): void {
    this.socket.emit('shared-session-created', session);
  }

  onNewSharedSession(): Observable<unknown> {
    return new Observable((obs) => {
      this.socket.on('new-shared-session', (data: unknown) => obs.next(data));
    });
  }

  onSharedSessionModified(): Observable<unknown> {
    return new Observable((obs) => {
      this.socket.on('shared-session-modified', (data: unknown) => obs.next(data));
    });
  }

  // ── Session Chat ─────────────────────────────────────────────────
  // groupId optionnel : si fourni, tous les membres du groupe partagent la même room
  joinSession(sessionId: string, userId: string, userName: string, groupId?: string): void {
    this.socket.emit('join-session', { sessionId, userId, userName, groupId: groupId ?? null });
  }

  leaveSession(sessionId: string): void {
    this.socket.emit('leave-session', { sessionId });
  }

  sendSessionMessage(text: string): void {
    this.socket.emit('send-session-message', { text });
  }

  // chatId = groupId pour sessions de groupe, sessionId pour sessions personnelles
  onSessionMessage(): Observable<{ chatId: string; message: { id: string; senderId: string; senderName: string; text: string; time: string } }> {
    return new Observable((obs) => {
      this.socket.on('session-message-receive', (data: any) => obs.next(data));
    });
  }

  // Historique de messages reçu au moment du join-session
  onSessionChatHistory(): Observable<{ chatId: string; messages: { id: string; senderId: string; senderName: string; text: string; time: string }[] }> {
    return new Observable((obs) => {
      this.socket.on('session-chat-history', (data: any) => obs.next(data));
    });
  }

  // ── Notes partagées ────────────────────────────────────────────────
  addSessionNote(text: string): void {
    this.socket.emit('session-add-note', { text });
  }

  removeSessionNote(noteId: string): void {
    this.socket.emit('session-remove-note', { noteId });
  }

  onSessionNotesHistory(): Observable<{ chatId: string; notes: { id: string; authorId: string; authorName: string; text: string; createdAt: string }[] }> {
    return new Observable((obs) => {
      this.socket.on('session-notes-history', (data: any) => obs.next(data));
    });
  }

  onSessionNoteAdded(): Observable<{ chatId: string; note: { id: string; authorId: string; authorName: string; text: string; createdAt: string } }> {
    return new Observable((obs) => {
      this.socket.on('session-note-added', (data: any) => obs.next(data));
    });
  }

  onSessionNoteRemoved(): Observable<{ chatId: string; noteId: string }> {
    return new Observable((obs) => {
      this.socket.on('session-note-removed', (data: any) => obs.next(data));
    });
  }

  // ── Cours items partagés ───────────────────────────────────────────
  broadcastCourseItemAdded(item: { id: string; type: string; title: string; content: string; authorName?: string }): void {
    this.socket.emit('session-add-course-item', item);
  }

  broadcastCourseItemRemoved(courseItemId: string): void {
    this.socket.emit('session-remove-course-item', { courseItemId });
  }

  onSessionCourseItemAdded(): Observable<{ chatId: string; item: { id: string; type: string; title: string; content: string; authorName?: string } }> {
    return new Observable((obs) => {
      this.socket.on('session-course-item-added', (data: any) => obs.next(data));
    });
  }

  onSessionCourseItemRemoved(): Observable<{ chatId: string; courseItemId: string }> {
    return new Observable((obs) => {
      this.socket.on('session-course-item-removed', (data: any) => obs.next(data));
    });
  }

  // ── Pièces jointes partagées ───────────────────────────────────────
  broadcastAttachmentAdded(att: { id: string; name: string; size: string; dataUrl?: string; mimeType?: string }): void {
    this.socket.emit('session-add-attachment', att);
  }

  broadcastAttachmentRemoved(id: string): void {
    this.socket.emit('session-remove-attachment', { id });
  }

  onSessionAttachmentAdded(): Observable<{ chatId: string; attachment: { id: string; name: string; size: string; dataUrl?: string; mimeType?: string } }> {
    return new Observable((obs) => {
      this.socket.on('session-attachment-added', (data: any) => obs.next(data));
    });
  }

  onSessionAttachmentRemoved(): Observable<{ chatId: string; id: string }> {
    return new Observable((obs) => {
      this.socket.on('session-attachment-removed', (data: any) => obs.next(data));
    });
  }

  // ── Liens rapides partagés ─────────────────────────────────────────
  broadcastLinkAdded(link: { id: string; label: string; url: string }): void {
    this.socket.emit('session-add-link', link);
  }

  broadcastLinkRemoved(id: string): void {
    this.socket.emit('session-remove-link', { id });
  }

  onSessionLinkAdded(): Observable<{ chatId: string; link: { id: string; label: string; url: string } }> {
    return new Observable((obs) => {
      this.socket.on('session-link-added', (data: any) => obs.next(data));
    });
  }

  onSessionLinkRemoved(): Observable<{ chatId: string; id: string }> {
    return new Observable((obs) => {
      this.socket.on('session-link-removed', (data: any) => obs.next(data));
    });
  }

  updateSessionObjectives(sessionId: string, objectives: string[]): void {
    this.socket.emit('update-session-objectives', { sessionId, objectives });
  }

  onSessionObjectivesUpdated(): Observable<{ sessionId: string; objectives: string[] }> {
    return new Observable((obs) => {
      this.socket.on(
        'session-objectives-updated',
        (data: { sessionId: string; objectives: string[] }) => obs.next(data)
      );
    });
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }
}

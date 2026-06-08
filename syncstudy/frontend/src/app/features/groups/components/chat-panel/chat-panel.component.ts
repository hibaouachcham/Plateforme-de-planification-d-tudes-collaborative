import {
  Component,
  Output,
  EventEmitter,
  inject,
  ViewChild,
  AfterViewChecked,
  effect,
  computed,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { CollaborationService } from '../../../../core/services/collaboration.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ChatMessage } from '../../../../core/models/group.model';
import { format } from 'date-fns';

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, ScrollingModule],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[60] fade-in"
           (click)="close.emit()"
           role="presentation"
           aria-hidden="true"></div>

      <div class="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[70]
                  flex flex-col slide-in-right"
           role="dialog"
           aria-modal="true"
           [attr.aria-label]="'Chat du groupe ' + groupName()">
        <div class="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 class="text-xl font-black text-slate-900">{{ groupName() }}</h3>
            <div class="flex items-center gap-2 mt-1">
              <span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" aria-hidden="true"></span>
              <span class="text-xs font-bold text-slate-500">{{ onlineCount() }} en ligne</span>
            </div>
          </div>
          <button type="button"
                  (click)="close.emit()"
                  aria-label="Fermer le chat"
                  class="p-2 hover:bg-slate-100 rounded-xl transition-all">
            <span class="material-icons text-slate-400" aria-hidden="true">close</span>
          </button>
        </div>

        <div class="flex-1 min-h-0 flex flex-col bg-slate-50/50">
          @if (!messagesForGroup().length) {
            <div class="flex-1 flex flex-col items-center justify-center text-center p-8">
              <span class="material-icons text-4xl text-slate-200 mb-4" aria-hidden="true">chat_bubble_outline</span>
              <p class="text-slate-500 font-medium">Aucun message. Commencez la discussion !</p>
            </div>
          } @else {
            <cdk-virtual-scroll-viewport
              #viewport
              itemSize="76"
              minBufferPx="200"
              maxBufferPx="400"
              tabindex="0"
              class="h-full w-full"
              aria-label="Messages du groupe">
              <div *cdkVirtualFor="let msg of messagesForGroup(); trackBy: trackMsgById"
                   [class]="'flex flex-col px-6 py-2 ' + (isMe(msg) ? 'items-end' : 'items-start')">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    {{ msg.senderName }}
                  </span>
                  <span class="text-[10px] text-slate-300">{{ formatTime(msg.timestamp) }}</span>
                </div>
                <div [class]="'px-4 py-2.5 rounded-2xl max-w-[85%] text-sm font-medium shadow-sm '
                             + (isMe(msg)
                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none')">
                  {{ msg.text }}
                </div>
              </div>
            </cdk-virtual-scroll-viewport>
          }
        </div>

        <div class="p-6 bg-white border-t border-slate-100 flex gap-3">
          <input [(ngModel)]="inputText" (keydown.enter)="send()" type="text"
                 placeholder="Écrivez votre message..."
                 aria-label="Message à envoyer"
                 class="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm
                        focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
          <button type="button"
                  (click)="send()"
                  aria-label="Envoyer le message"
                  class="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700
                         transition-all shadow-lg shadow-indigo-100">
            <span class="material-icons" aria-hidden="true">send</span>
          </button>
        </div>
      </div>
    }
  `,
})
export class ChatPanelComponent implements AfterViewChecked {
  isOpen = input(false);
  groupId = input('');
  groupName = input('');

  @Output() close = new EventEmitter<void>();
  @ViewChild('viewport') viewport?: CdkVirtualScrollViewport;

  collab = inject(CollaborationService);
  auth = inject(AuthService);

  inputText = '';
  private needsScroll = false;

  messagesForGroup = computed(() => {
    const gid = this.groupId();
    if (!gid) return [];
    return this.collab.messages()[gid] ?? [];
  });

  onlineCount = computed(() => {
    const gid = this.groupId();
    if (!gid) return 0;
    return (this.collab.online()[gid] ?? []).length;
  });

  constructor() {
    effect(() => {
      const n = this.messagesForGroup().length;
      const gid = this.groupId();
      if (gid && n > 0) this.needsScroll = true;
    });
  }

  trackMsgById(_i: number, msg: ChatMessage): string {
    return msg.id;
  }

  ngAfterViewChecked(): void {
    const list = this.messagesForGroup();
    if (this.needsScroll && this.viewport && list.length) {
      const last = list.length - 1;
      queueMicrotask(() => this.viewport?.scrollToIndex(last, 'smooth'));
      this.needsScroll = false;
    }
  }

  send(): void {
    const text = this.inputText.trim();
    const gid = this.groupId();
    if (!text || !gid) return;
    this.collab.sendMessage(gid, this.auth.currentUser()?.name ?? 'Moi', text);
    this.inputText = '';
    this.needsScroll = true;
  }

  isMe(msg: ChatMessage): boolean {
    const uid = this.auth.currentUser()?.id;
    return !!uid && msg.senderId === uid;
  }

  formatTime(ts: string): string {
    try {
      return format(new Date(ts), 'HH:mm');
    } catch {
      return '';
    }
  }
}

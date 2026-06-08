import { Component, inject, signal, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlanningService } from '../../../core/services/planning.service';
import { FormatTimePipe } from '../../pipes/format-time.pipe';

@Component({
  selector: 'app-session-bar',
  standalone: true,
  imports: [CommonModule, FormatTimePipe],
  template: `
    @if (planning.activeSession()) {
      <div class="mx-6 mt-4 bg-indigo-600 px-6 py-4 rounded-2xl text-white
                  flex items-center justify-between shadow-lg shadow-indigo-100 slide-in-up">
        <div class="flex items-center gap-4">
          <div class="bg-white/20 p-2 rounded-xl">
            <span class="material-icons animate-pulse">play_arrow</span>
          </div>
          <div>
            <p class="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Session en cours</p>
            <p class="font-bold">{{ sessionName() }}</p>
          </div>
        </div>
        <div class="flex items-center gap-6">
          <p class="text-2xl font-black font-mono tracking-tighter">{{ timer() | formatTime }}</p>
          <button (click)="planning.stopSession()"
                  class="bg-white text-indigo-600 p-2 rounded-xl hover:bg-indigo-50 transition-all">
            <span class="material-icons">stop</span>
          </button>
        </div>
      </div>
    }
  `,
})
export class SessionBarComponent implements OnDestroy {
  planning = inject(PlanningService);
  timer    = signal(0);
  private interval?: ReturnType<typeof setInterval>;

  private fx = effect(() => {
    clearInterval(this.interval);
    if (this.planning.activeId()) {
      this.timer.set(0);
      this.interval = setInterval(() => this.timer.update((t) => t + 1), 1000);
    }
  }, { allowSignalWrites: true });

  sessionName(): string {
    const s = this.planning.activeSession();
    return s ? (this.planning.subjects().find((x) => x.id === s.subjectId)?.name ?? '—') : '';
  }

  ngOnDestroy(): void { clearInterval(this.interval); }
}

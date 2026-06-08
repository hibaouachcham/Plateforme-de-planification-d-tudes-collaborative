import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PlanningService } from '../../../core/services/planning.service';
import { StudySession } from '../../../core/models/session.model';
import { format, formatDuration, intervalToDuration } from 'date-fns';
import { fr } from 'date-fns/locale';

@Component({
  selector: 'app-session-details-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden fade-in">

      <!-- TOP BAR -->
      <header class="flex-shrink-0 flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div class="flex items-center gap-4">
          <div class="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0"
               [style.backgroundColor]="subjectColor()">
            <span class="material-icons text-lg">{{ studyType() === 'project' ? 'build' : 'menu_book' }}</span>
          </div>
          <div>
            <h1 class="text-xl font-black text-slate-900 dark:text-white leading-tight">{{ subjectName() }}</h1>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                    [class]="studyType() === 'project'
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                      : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'">
                {{ studyType() === 'project' ? 'Projet' : 'Cours' }}
              </span>
              @if (session()?.isGroupSession) {
                <span class="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  Groupe
                </span>
              }
              <span class="text-xs font-bold px-2.5 py-0.5 rounded-full" [class]="statusBadgeClass()">
                {{ statusLabel() }}
              </span>
            </div>
          </div>
        </div>

        <a routerLink="/app/sessions"
           class="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
          <span class="material-icons text-base">arrow_back</span>
          Retour aux sessions
        </a>
      </header>

      <!-- BODY -->
      <div class="flex-1 flex gap-5 p-5 min-h-0 overflow-auto">

        @if (isUnscheduled()) {
          <!-- ── SESSION NON PLANIFIÉE ─────────────────────────────────────── -->
          <div class="flex-1 flex flex-col gap-4">

            <!-- Bannière d'avertissement -->
            <div class="bg-amber-50 dark:bg-amber-950/40 rounded-3xl p-6 border border-amber-200 dark:border-amber-700 flex items-start gap-4">
              <span class="material-icons text-amber-500 text-3xl flex-shrink-0">event_busy</span>
              <div>
                <p class="font-black text-amber-800 dark:text-amber-300 text-base mb-1">Session en attente de planification</p>
                <p class="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
                  Aucune disponibilité commune n'a été trouvée pour ce créneau. Concertez-vous avec les membres du groupe pour
                  convenir d'un horaire qui convient à tous.
                </p>
              </div>
            </div>

            <!-- Infos du créneau demandé -->
            <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Créneau demandé</p>
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-slate-500 dark:text-slate-400">Date</span>
                  <span class="text-sm font-bold text-slate-900 dark:text-white">
                    {{ session()?.startTime ? format(session()!.startTime, 'EEE dd MMM yyyy', { locale: fr }) : '—' }}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-slate-500 dark:text-slate-400">Début prévu</span>
                  <span class="text-sm font-bold text-slate-900 dark:text-white">{{ formatTime(session()?.startTime) }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-slate-500 dark:text-slate-400">Fin prévue</span>
                  <span class="text-sm font-bold text-slate-900 dark:text-white">{{ formatTime(session()?.endTime) }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-slate-500 dark:text-slate-400">Durée</span>
                  <span class="text-sm font-bold text-slate-900 dark:text-white">{{ plannedDuration() }}</span>
                </div>
              </div>
            </div>

            @if (session()?.objectives?.length) {
              <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Objectifs</p>
                <ul class="space-y-2">
                  @for (obj of session()!.objectives!; track obj) {
                    <li class="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <span class="material-icons text-indigo-400 text-base mt-0.5">radio_button_unchecked</span>
                      {{ obj }}
                    </li>
                  }
                </ul>
              </div>
            }

            <!-- Message d'action -->
            <div class="bg-indigo-50 dark:bg-indigo-950/30 rounded-3xl p-5 border border-indigo-200 dark:border-indigo-700">
              <div class="flex items-start gap-3">
                <span class="material-icons text-indigo-500 text-base mt-0.5">info</span>
                <p class="text-sm text-indigo-700 dark:text-indigo-300 leading-relaxed font-medium">
                  Une fois que vous vous êtes mis d'accord sur un créneau, un membre du groupe peut créer une nouvelle session
                  de groupe avec l'horaire convenu. Cette session sera alors visible dans vos plannings respectifs.
                </p>
              </div>
            </div>
          </div>
        } @else {

        <!-- LEFT: Infos session -->
        <div class="w-64 flex-shrink-0 flex flex-col gap-4">

          <!-- Durée réelle -->
          <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Durée réelle</p>
            <p class="text-3xl font-black text-slate-900 dark:text-white">{{ actualDuration() }}</p>
          </div>

          <!-- Infos -->
          <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Infos</p>
            <div class="flex justify-between text-sm">
              <span class="text-slate-500 dark:text-slate-400 font-medium">Début prévu</span>
              <span class="font-bold text-slate-900 dark:text-white">{{ formatTime(session()?.startTime) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-slate-500 dark:text-slate-400 font-medium">Fin prévue</span>
              <span class="font-bold text-slate-900 dark:text-white">{{ formatTime(session()?.endTime) }}</span>
            </div>
            @if (session()?.actualStart) {
              <div class="flex justify-between text-sm">
                <span class="text-slate-500 dark:text-slate-400 font-medium">Démarré à</span>
                <span class="font-bold text-slate-900 dark:text-white">{{ formatTime(session()?.actualStart) }}</span>
              </div>
            }
            @if (session()?.actualEnd) {
              <div class="flex justify-between text-sm">
                <span class="text-slate-500 dark:text-slate-400 font-medium">Terminé à</span>
                <span class="font-bold text-slate-900 dark:text-white">{{ formatTime(session()?.actualEnd) }}</span>
              </div>
            }
          </div>

          <!-- Objectif -->
          @if (session()?.objectives?.length) {
            <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Objectifs</p>
              <ul class="space-y-2">
                @for (obj of session()!.objectives!; track obj) {
                  <li class="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <span class="material-icons text-emerald-500 text-base mt-0.5">check_circle</span>
                    {{ obj }}
                  </li>
                }
              </ul>
            </div>
          }
        </div>

        <!-- CENTER: Notes + Todos + Flashcards -->
        <div class="flex-1 flex flex-col gap-4 min-w-0 overflow-y-auto">

          <!-- Notes -->
          <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <div class="flex items-center gap-3 mb-4">
              <span class="material-icons text-indigo-600">edit_note</span>
              <h2 class="text-lg font-black text-slate-900 dark:text-white">Notes de Session</h2>
            </div>
            @if (session()?.note) {
              <div class="text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                {{ session()!.note }}
              </div>
            } @else {
              <div class="flex flex-col items-center justify-center h-24 text-slate-400 dark:text-slate-500">
                <span class="material-icons text-3xl mb-1">notes</span>
                <p class="text-sm font-medium">Aucune note enregistrée.</p>
              </div>
            }
          </div>

          <!-- Objectif de session -->
          @if (session()?.sessionGoal) {
            <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
              <div class="flex items-center gap-3 mb-3">
                <span class="material-icons text-amber-500">flag</span>
                <h2 class="text-lg font-black text-slate-900 dark:text-white">Objectif de session</h2>
              </div>
              <p class="text-sm text-slate-700 dark:text-slate-300">{{ session()!.sessionGoal }}</p>
            </div>
          }

          <!-- To-Do -->
          @if (session()?.todos?.length) {
            <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
              <div class="flex items-center gap-3 mb-4">
                <span class="material-icons text-emerald-600">checklist</span>
                <h2 class="text-lg font-black text-slate-900 dark:text-white">To-Do List</h2>
                <span class="text-xs font-bold text-slate-400 ml-auto">
                  {{ todoDoneCount() }} / {{ todoTotal() }} complétés
                </span>
              </div>
              <ul class="space-y-2">
                @for (todo of sessionTodos(); track todo.id) {
                  <li class="flex items-center gap-3 text-sm">
                    <span class="material-icons text-base" [class]="todo.done ? 'text-emerald-500' : 'text-slate-300'">
                      {{ todo.done ? 'check_circle' : 'radio_button_unchecked' }}
                    </span>
                    <span [class]="todo.done ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'">
                      {{ todo.text }}
                    </span>
                  </li>
                }
              </ul>
            </div>
          }

          <!-- Flashcards -->
          @if (session()?.flashcards?.length) {
            <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
              <div class="flex items-center gap-3 mb-4">
                <span class="material-icons text-violet-600">style</span>
                <h2 class="text-lg font-black text-slate-900 dark:text-white">Flashcards</h2>
                <span class="text-xs font-bold text-slate-400 ml-auto">{{ sessionFlashcards().length }} carte(s)</span>
              </div>
              <div class="space-y-3">
                @for (card of sessionFlashcards(); track card.id) {
                  <div class="rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div class="bg-violet-50 dark:bg-violet-950/30 px-4 py-2.5">
                      <p class="text-xs font-black text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1">Question</p>
                      <p class="text-sm font-bold text-slate-900 dark:text-white">{{ card.question }}</p>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-800 px-4 py-2.5">
                      <p class="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Réponse</p>
                      <p class="text-sm text-slate-700 dark:text-slate-300">{{ card.answer }}</p>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Cours / Matériaux -->
          @if (session()?.courseItems?.length) {
            <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
              <div class="flex items-center gap-3 mb-4">
                <span class="material-icons text-blue-600">library_books</span>
                <h2 class="text-lg font-black text-slate-900 dark:text-white">Matériaux de cours</h2>
              </div>
              <div class="space-y-3">
                @for (item of sessionCourseItems(); track item.id) {
                  <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                            [class]="item.type === 'definition' ? 'bg-blue-100 text-blue-600' :
                                     item.type === 'formula' ? 'bg-amber-100 text-amber-600' :
                                     'bg-emerald-100 text-emerald-600'">
                        {{ item.type }}
                      </span>
                      <p class="text-sm font-bold text-slate-900 dark:text-white">{{ item.title }}</p>
                    </div>
                    <p class="text-sm text-slate-600 dark:text-slate-400">{{ item.content }}</p>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Pièces jointes -->
          @if (sessionAttachments().length) {
            <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
              <div class="flex items-center gap-3 mb-4">
                <span class="material-icons text-indigo-600">attach_file</span>
                <h2 class="text-lg font-black text-slate-900 dark:text-white">Pièces jointes</h2>
              </div>
              <div class="space-y-2">
                @for (f of sessionAttachments(); track f.id) {
                  <div class="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <span class="material-icons text-slate-400">description</span>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-bold text-slate-900 dark:text-white truncate">{{ f.name }}</p>
                      <p class="text-xs text-slate-400">{{ f.size }}</p>
                    </div>
                    @if (f.dataUrl) {
                      <button (click)="openAttachment(f.dataUrl)"
                              class="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition">
                        Ouvrir
                      </button>
                    } @else {
                      <span class="text-xs text-slate-400">indisponible</span>
                    }
                  </div>
                }
              </div>
            </div>
          }

        </div>

        <!-- RIGHT: Résumé -->
        <div class="w-72 flex-shrink-0 flex flex-col gap-4">
          <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Résumé</p>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm text-slate-500 dark:text-slate-400">Date</span>
                <span class="text-sm font-bold text-slate-900 dark:text-white">
                  {{ session()?.startTime ? format(session()!.startTime, 'EEE dd MMM yyyy', { locale: fr }) : '—' }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-slate-500 dark:text-slate-400">Durée planifiée</span>
                <span class="text-sm font-bold text-slate-900 dark:text-white">{{ plannedDuration() }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-slate-500 dark:text-slate-400">Durée réelle</span>
                <span class="text-sm font-bold text-emerald-600 dark:text-emerald-400">{{ actualDuration() }}</span>
              </div>
            </div>
          </div>

          <!-- Message si pas de données -->
          <div class="bg-amber-50 dark:bg-amber-950/30 rounded-3xl p-5 border border-amber-200 dark:border-amber-800">
            <div class="flex items-start gap-3">
              <span class="material-icons text-amber-600 dark:text-amber-400 text-base mt-0.5">info</span>
              <p class="text-xs text-amber-800 dark:text-amber-200 font-medium leading-relaxed">
                Les notes, todo et pièces jointes sont sauvegardées pendant la session active. Retrouvez-les ici après chaque session.
              </p>
            </div>
          </div>
        </div>

        } <!-- end @else (not unscheduled) -->

      </div>
    </div>
  `,
})
export class SessionDetailsPageComponent implements OnInit {
  private route    = inject(ActivatedRoute);
  private router   = inject(Router);
  planning         = inject(PlanningService);

  format = format;
  fr     = fr;

  private sessionId = signal<string>('');

  session = computed(() =>
    this.planning.sessions().find(s => s.id === this.sessionId()) ?? null
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.sessionId.set(id);
    if (!id) {
      this.router.navigate(['/app/sessions']);
    }
  }

  subjectName = computed(() => {
    const s = this.session();
    if (!s) return '—';
    // Priorité : nom de la matière locale → title de la session → '—'
    return this.planning.subjects().find(x => x.id === s.subjectId)?.name
        ?? (s.title && s.title.trim() ? s.title : '—');
  });

  subjectColor = computed(() => {
    const s = this.session();
    if (!s) return '#6366f1';
    return this.planning.subjects().find(x => x.id === s.subjectId)?.color ?? '#6366f1';
  });

  studyType = computed(() => {
    const s = this.session();
    if (!s) return 'course';
    return this.planning.subjects().find(x => x.id === s.subjectId)?.studyType
        ?? (s.isGroupSession ? 'course' : 'course');
  });

  isUnscheduled = computed(() => this.session()?.status === 'unscheduled');

  statusLabel = computed(() => {
    const s = this.session();
    if (!s) return '';
    switch (s.status) {
      case 'unscheduled': return '⚠ Non planifiée';
      case 'completed':   return '✓ Terminée';
      case 'active':      return '▶ En cours';
      case 'expired':     return '⏱ Expirée';
      default:            return '🕐 Planifiée';
    }
  });

  statusBadgeClass = computed(() => {
    const s = this.session();
    if (!s) return '';
    switch (s.status) {
      case 'unscheduled': return 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400';
      case 'completed':   return 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400';
      case 'active':      return 'bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400';
      case 'expired':     return 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400';
      default:            return 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400';
    }
  });

  actualDuration = computed(() => {
    const s = this.session();
    if (!s) return '—';
    if (s.pausedElapsedSeconds != null) {
      const total = Math.max(0, s.pausedElapsedSeconds);
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const sec = total % 60;
      if (h > 0) return `${h}h${String(m).padStart(2, '0')}m${String(sec).padStart(2, '0')}s`;
      if (m > 0) return `${m}m${String(sec).padStart(2, '0')}s`;
      return `${sec}s`;
    }
    if (s.actualDurationMinutes) {
      const h = Math.floor(s.actualDurationMinutes / 60);
      const m = s.actualDurationMinutes % 60;
      return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`;
    }
    if (s.actualStart && s.actualEnd) {
      const mins = Math.round((new Date(s.actualEnd).getTime() - new Date(s.actualStart).getTime()) / 60_000);
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`;
    }
    return '—';
  });

  plannedDuration = computed(() => {
    const s = this.session();
    if (!s) return '—';
    const mins = Math.round((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60_000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`;
  });

  formatTime(d: Date | string | undefined): string {
    if (!d) return '—';
    return format(new Date(d), 'HH:mm');
  }

  readonly sessionTodos = computed(() => this.session()?.todos ?? []);
  readonly todoDoneCount = computed(() => this.sessionTodos().filter(t => t.done).length);
  readonly todoTotal = computed(() => this.sessionTodos().length);
  readonly sessionFlashcards = computed(() => this.session()?.flashcards ?? []);
  readonly sessionCourseItems = computed(() => this.session()?.courseItems ?? []);
  readonly sessionAttachments = computed(() => this.session()?.attachments ?? []);

  openAttachment(dataUrl: string): void {
    const tab = window.open('', '_blank');
    if (!tab) return;
    this.dataUrlToObjectUrl(dataUrl)
      .then((objectUrl) => {
        tab.location.href = objectUrl;
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      })
      .catch(() => tab.close());
  }

  private async dataUrlToObjectUrl(dataUrl: string): Promise<string> {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }
}

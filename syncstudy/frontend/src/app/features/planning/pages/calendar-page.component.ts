import { Component, inject, computed, signal, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import { PlanningService } from '../../../core/services/planning.service';
import { StudySession } from '../../../core/models/session.model';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/services/toast.service';
import { SessionConflictService } from '../../../core/services/session-conflict.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-calendar-page',
  standalone: true,
  imports: [CommonModule, FullCalendarModule, FormsModule, RouterLink],
  template: `
    <div class="space-y-8 fade-in">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-black text-slate-900 dark:text-white">Planning</h1>
          <p class="text-slate-500 dark:text-slate-400 mt-1">Visualisez et gérez vos sessions d'étude.</p>
        </div>
        <div class="flex items-center gap-3">
          <button (click)="openAddSessionModal()"
                  class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 
                         text-slate-900 dark:text-white px-6 py-3 rounded-2xl font-bold
                         hover:bg-slate-50 dark:hover:bg-slate-800 transition-all 
                         flex items-center gap-2 shadow-sm">
            <span class="material-icons">add</span>
            Ajouter une session
          </button>
          <button (click)="generateSchedule()"
                  class="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold
                         hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100
                         flex items-center gap-2 self-start">
            <span class="material-icons">bolt</span>
            Générer mon planning
          </button>
        </div>
      </div>


      <!-- Alerte chevauchements -->
      @if (overlappingSessionIds().size > 0) {
        <div class="p-4 rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 flex items-start gap-3">
          <span class="material-icons text-rose-500 mt-0.5">event_busy</span>
          <div class="flex-1">
            <p class="text-sm font-black text-rose-700 dark:text-rose-300 uppercase tracking-wider mb-1">
              {{ overlappingSessionIds().size }} session{{ overlappingSessionIds().size > 1 ? 's' : '' }} en conflit de créneau
            </p>
            <p class="text-xs text-rose-600 dark:text-rose-400">
              Des sessions se chevauchent (bordure rouge dans le calendrier). Supprimez ou déplacez-les pour résoudre le conflit.
            </p>
          </div>
        </div>
      }

      @if (planning.lastScheduleShortfall().length) {
        <div class="p-5 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 space-y-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3">
              <span class="material-icons text-amber-600 dark:text-amber-400 mt-0.5">warning</span>
              <div class="flex-1">
                <p class="text-sm font-black text-amber-800 dark:text-amber-200 uppercase tracking-wider mb-1">
                  Objectifs partiellement planifiés
                </p>
                <p class="text-xs text-amber-700 dark:text-amber-300">
                  L'algorithme n'a pas trouvé assez de créneaux libres pour planifier toutes vos heures.
                  Les sessions de groupe déjà présentes occupent une partie des plages disponibles.
                </p>
              </div>
            </div>
            <button (click)="dismissShortfall()"
                    class="p-1 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900 transition-all flex-shrink-0"
                    title="Fermer">
              <span class="material-icons text-amber-600 dark:text-amber-400 text-base">close</span>
            </button>
          </div>

          <!-- Cours non planifiés -->
          @if (courseShortfalls().length) {
            <div>
              <p class="text-xs font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1">
                <span class="material-icons text-sm">menu_book</span> Cours
              </p>
              <ul class="space-y-1.5">
                @for (row of courseShortfalls(); track row.subjectId) {
                  <li class="flex items-center justify-between bg-white/60 dark:bg-slate-800/60 rounded-xl px-3 py-2">
                    <span class="text-sm font-bold text-amber-900 dark:text-amber-100">{{ row.subjectName }}</span>
                    <span class="text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-full">
                      {{ row.hoursMissing }}h non planifiées
                    </span>
                  </li>
                }
              </ul>
            </div>
          }

          <!-- Projets non planifiés -->
          @if (projectShortfalls().length) {
            <div>
              <p class="text-xs font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1">
                <span class="material-icons text-sm">build</span> Projets
              </p>
              <ul class="space-y-1.5">
                @for (row of projectShortfalls(); track row.subjectId) {
                  <li class="flex items-center justify-between bg-white/60 dark:bg-slate-800/60 rounded-xl px-3 py-2">
                    <span class="text-sm font-bold text-amber-900 dark:text-amber-100">{{ row.subjectName }}</span>
                    <span class="text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-full">
                      {{ row.hoursMissing }}h non planifiées
                    </span>
                  </li>
                }
              </ul>
            </div>
          }

          <!-- Message d'action si les disponibilités sont insuffisantes -->
          @if (needsMoreAvailability()) {
            <div class="flex items-start gap-3 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800">
              <span class="material-icons text-indigo-600 dark:text-indigo-400 text-base mt-0.5">lightbulb</span>
              <div class="flex-1">
                <p class="text-sm font-bold text-indigo-800 dark:text-indigo-200">
                  Que faire ?
                </p>
                <ul class="mt-2 space-y-1.5 text-xs text-indigo-700 dark:text-indigo-300">
                  <li class="flex items-start gap-1.5">
                    <span class="material-icons text-xs mt-0.5 shrink-0">add_circle_outline</span>
                    <span><strong>Ajoutez des créneaux</strong> dans vos disponibilités pour libérer de la place à l'algorithme.</span>
                  </li>
                  <li class="flex items-start gap-1.5">
                    <span class="material-icons text-xs mt-0.5 shrink-0">tune</span>
                    <span><strong>Réduisez les objectifs hebdomadaires</strong> de certaines matières / projets si vos disponibilités sont limitées.</span>
                  </li>
                  <li class="flex items-start gap-1.5">
                    <span class="material-icons text-xs mt-0.5 shrink-0">delete_outline</span>
                    <span><strong>Supprimez les sessions de groupe</strong> qui occupent vos créneaux si elles ne sont plus pertinentes.</span>
                  </li>
                </ul>
                <a routerLink="/app/availabilities"
                   class="inline-flex items-center gap-1.5 mt-3 text-xs font-black text-indigo-600 dark:text-indigo-400
                          hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors">
                  <span class="material-icons text-sm">event_available</span>
                  Gérer mes disponibilités →
                </a>
              </div>
            </div>
          }
        </div>
      }

      <!-- Calendar Card -->
      <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        <full-calendar [options]="calendarOptions()" class="syncstudy-cal" />
      </div>

      <!-- Session detail drawer -->
      @if (selectedSession()) {
        <div class="fixed inset-0 bg-slate-900/70 dark:bg-black/70 backdrop-blur-sm z-50 fade-in"
             (click)="selectedSession.set(null)">
        </div>
        <div class="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white dark:bg-slate-900 shadow-2xl z-50 slide-in-right p-8 overflow-y-auto"
             (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-black text-slate-900 dark:text-white">Détails de la session</h3>
            <button (click)="selectedSession.set(null)"
                    class="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
              <span class="material-icons text-slate-400">close</span>
            </button>
          </div>

          @if (selectedSession(); as s) {
            <div class="space-y-4">
              <div class="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl">
                <div class="w-3 h-3 rounded-full flex-shrink-0"
                     [style.background]="subjectColor(s.subjectId)"></div>
                <p class="font-bold text-slate-900 dark:text-white">{{ subjectName(s.subjectId, s.title) }}</p>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                  <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Début</p>
                  <p class="font-bold text-slate-900 dark:text-white text-sm">{{ format(s.startTime, 'HH:mm') }}</p>
                  <p class="text-xs text-slate-500 dark:text-slate-400">{{ format(s.startTime, 'EEE dd MMM', { locale: fr }) }}</p>
                </div>
                <div class="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                  <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Fin</p>
                  <p class="font-bold text-slate-900 dark:text-white text-sm">{{ format(s.endTime, 'HH:mm') }}</p>
                  <p class="text-xs text-slate-500 dark:text-slate-400">{{ format(s.endTime, 'EEE dd MMM', { locale: fr }) }}</p>
                </div>
              </div>

              <div class="flex gap-3 mt-2 flex-wrap">
                @if (s.isDraft && s.isAutoGenerated) {
                  <span class="text-xs font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-full">Brouillon</span>
                }
                @if (s.isGroupSession) {
                  <span class="text-xs font-black bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-full">Groupe</span>
                }
                @if (s.isCompleted) {
                  <span class="text-xs font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-full">Complétée</span>
                } @else if (selectedSessionExpired()) {
                  <span class="text-xs font-black bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-full">Expirée</span>
                } @else {
                  <span class="text-xs font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-full">À faire</span>
                }
              </div>

              @if (!s.isCompleted) {
                @if (selectedSessionExpired()) {
                  <div class="space-y-2 mt-4">
                    <div class="w-full flex items-center justify-center gap-2 py-3 rounded-2xl
                                bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-sm">
                      <span class="material-icons text-base">event_busy</span>
                      Session expirée
                    </div>
                    @if (s.isDraft && s.isAutoGenerated) {
                      <button (click)="deleteSelectedSession()"
                              class="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl
                                     bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-bold text-sm
                                     hover:bg-rose-100 dark:hover:bg-rose-900 transition-all">
                        <span class="material-icons text-base">delete_outline</span>
                        Supprimer cette session
                      </button>
                    }
                  </div>
                } @else {
                  <button (click)="startAndClose(s.id)"
                          [disabled]="!!planning.activeId()"
                          class="w-full bg-indigo-600 text-white py-3 rounded-2xl font-bold
                                 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2
                                 disabled:opacity-40 disabled:cursor-not-allowed mt-4">
                    <span class="material-icons">play_arrow</span>
                    Démarrer la session
                  </button>
                }
              }
            </div>
          }
        </div>
      }

      <!-- Add session modal -->
      @if (showAddModal()) {
        <div class="fixed inset-0 bg-slate-900/70 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center fade-in"
             (click)="showAddModal.set(false)">
          <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 w-full max-w-md mx-4 border border-slate-200 dark:border-slate-700"
               (click)="$event.stopPropagation()">
            <h3 class="text-xl font-black text-slate-900 dark:text-white mb-6">Nouvelle session</h3>
            <form (ngSubmit)="addSession()" class="space-y-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Portée</label>
                <div class="flex gap-2">
                  <button type="button" (click)="setAddModalScope('course')"
                          [class]="addModalScope() === 'course'
                            ? 'flex-1 py-2.5 rounded-2xl border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-black uppercase tracking-wider'
                            : 'flex-1 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800'">
                    Cours
                  </button>
                  <button type="button" (click)="setAddModalScope('project')"
                          [class]="addModalScope() === 'project'
                            ? 'flex-1 py-2.5 rounded-2xl border-2 border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-black uppercase tracking-wider'
                            : 'flex-1 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800'">
                    Projet
                  </button>
                </div>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  {{ addModalScope() === 'project' ? 'Projet' : 'Cours / matière' }}
                </label>
                <select [(ngModel)]="newSession.subjectId" name="subjectId"
                        class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 
                               rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white
                               focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all">
                  <option value="" disabled>{{ addModalScope() === 'project' ? 'Choisir un projet' : 'Choisir un cours' }}</option>
                  @for (s of subjectsForAddModal(); track s.id) {
                    <option [value]="s.id">{{ s.name }}</option>
                  }
                </select>
                @if (!subjectsForAddModal().length) {
                  <p class="mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                    {{ addModalScope() === 'project'
                      ? 'Aucun projet. Créez-en depuis la page Projets.'
                      : 'Aucun cours. Créez-en depuis la page Matières.' }}
                  </p>
                }
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Début</label>
                  <input [(ngModel)]="newSession.startTime" name="start" type="datetime-local"
                         class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 
                                rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white
                                focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Fin</label>
                  <input [(ngModel)]="newSession.endTime" name="end" type="datetime-local"
                         class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 
                                rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white
                                focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
                </div>
              </div>
              <div class="flex justify-end gap-3 mt-4">
                <button type="button" (click)="showAddModal.set(false)"
                        class="px-5 py-2 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-400 
                               hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                  Annuler
                </button>
                <button type="submit"
                        class="px-6 py-2 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all">
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    /* LIGHT MODE & COMMON STYLES */
    :host ::ng-deep .syncstudy-cal {
      --fc-border-color: #e2e8f0;
      --fc-button-bg-color: #6366f1;
      --fc-button-border-color: #6366f1;
      --fc-button-hover-bg-color: #4f46e5;
      --fc-today-bg-color: #eef2ff;

      .fc-toolbar-title {
        font-size: 1.1rem !important;
        font-weight: 800 !important;
      }
      .fc-button {
        border-radius: 0.75rem !important;
        font-weight: 600 !important;
      }
      .fc-event {
        border-radius: 12px !important;
        padding: 4px 8px !important;
        font-size: 0.8rem !important;
        font-weight: 600 !important;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important;
      }

      .fc-event.syncstudy-draft-event {
        opacity: 0.55 !important;
        border-style: dashed !important;
        border-width: 2px !important;
        font-style: italic !important;
      }

      .fc-event.syncstudy-completed-event {
        opacity: 0.5 !important;
        filter: saturate(45%) !important;
        border-style: solid !important;
        border-width: 2px !important;
      }

      .fc-theme-standard {
        background-color: transparent !important;
      }
      .fc-col-header-cell, .fc-timegrid-slot-label {
        background-color: #f8fafc !important;
        color: #64748b !important;
      }
      .fc-scrollgrid, th, td, .fc-timegrid-slot {
        border-color: #e2e8f0 !important;
      }
    }

    /* DARK MODE OVERRIDES */
    :host-context(.dark) ::ng-deep .syncstudy-cal {
      --fc-border-color: #334155;
      --fc-today-bg-color: #1e293b;

      .fc-theme-standard {
        background-color: transparent !important;
      }
      .fc-scrollgrid, th, td, .fc-timegrid-col, .fc-timegrid-axis, .fc-timegrid-slot, .fc-timegrid-divider, .fc-daygrid-day, .fc-daygrid-day-top {
        border-color: #334155 !important;
      }
      .fc-col-header-cell, .fc-timegrid-axis, .fc-timegrid-slot-label, .fc-list-day-cushion, .fc-popover-header {
        background-color: #1e293b !important;
        color: #e2e8f0 !important;
      }
      .fc-day-today {
        background-color: #1e293b !important;
      }
      .fc-popover {
        background-color: #0f172a !important;
        border-color: #334155 !important;
        color: #e2e8f0 !important;
      }

      .fc-event.syncstudy-draft-event {
        opacity: 0.55 !important;
        border-style: dashed !important;
        border-width: 2px !important;
        font-style: italic !important;
      }

      .fc-event.syncstudy-completed-event {
        opacity: 0.5 !important;
        filter: saturate(45%) !important;
        border-style: solid !important;
        border-width: 2px !important;
      }
    }
  `],
})
export class CalendarPageComponent {
  planning = inject(PlanningService);
  toast    = inject(ToastService);
  conflicts = inject(SessionConflictService);
  auth     = inject(AuthService);
  router   = inject(Router);
  private zone = inject(NgZone);

  /** ← Ces deux lignes étaient manquantes → c'était la cause des erreurs */
  format = format;
  fr = fr;

  /** IDs de toutes les sessions en chevauchement (recalculé à chaque changement) */
  readonly overlappingSessionIds = computed(() =>
    this.conflicts.findOverlaps(this.planning.sessions())
  );

  showAddModal = signal(false);
  selectedSession = signal<StudySession | null>(null);
  newSession = { subjectId: '', startTime: '', endTime: '' };
  addModalScope = signal<'course' | 'project'>('course');

  subjectsForAddModal = computed(() =>
    this.planning.subjects().filter((s) => (s.studyType ?? 'course') === this.addModalScope())
  );

  calendarOptions = computed<CalendarOptions>(() => ({
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'timeGridWeek',
    timeZone: 'local',
    locale: frLocale,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay',
    },
    height: 'auto',
    slotMinTime: '00:00:00',
    slotMaxTime: '24:00:00',
    allDaySlot: false,
    editable: true,
    selectable: true,
    events: this.toCalendarEvents(),
    eventClick: (info: EventClickArg) => this.onEventClick(info),
    dateClick: (info: DateClickArg) => this.onDateClick(info),
    eventDrop: (info: any) => this.onEventDrop(info),
    eventResize: (info: any) => this.onEventResize(info),
  }));

  private toCalendarEvents() {
    const conflictIds = this.overlappingSessionIds();
    return this.planning.sessions().map((s) => {
      const isConflict = conflictIds.has(s.id);
      return {
        id: s.id,
        title: isConflict
          ? `⚠ ${this.subjectName(s.subjectId, s.title)}`
          : this.subjectName(s.subjectId, s.title),
        // Garder une date/heure locale "naive" (sans suffixe UTC) pour éviter tout décalage horaire.
        start: format(new Date(s.startTime), "yyyy-MM-dd'T'HH:mm:ss"),
        end: format(new Date(s.endTime), "yyyy-MM-dd'T'HH:mm:ss"),
        backgroundColor: isConflict ? '#ef4444' : this.subjectColor(s.subjectId),
        borderColor:     isConflict ? '#b91c1c' : this.subjectColor(s.subjectId),
        textColor: '#ffffff',
        editable: !s.isCompleted,
        classNames: [
          ...(s.isCompleted ? ['syncstudy-completed-event'] : []),
          ...(s.isDraft && s.isAutoGenerated ? ['syncstudy-draft-event'] : []),
          ...(isConflict ? ['syncstudy-conflict-event'] : []),
        ],
        extendedProps: { sessionId: s.id },
      };
    });
  }

  onEventClick(info: EventClickArg): void {
    const id = info.event.extendedProps['sessionId'];
    const raw = this.planning.sessions().find((x) => x.id === id) ?? null;
    // NgZone.run() force Angular à détecter les changements après le callback FullCalendar
    this.zone.run(() => {
      if (raw) {
        this.selectedSession.set({
          ...raw,
          startTime: new Date(raw.startTime),
          endTime:   new Date(raw.endTime),
        });
      } else {
        this.selectedSession.set(null);
      }
    });
  }

  onDateClick(info: DateClickArg): void {
    this.zone.run(() => {
      const dt = info.dateStr.slice(0, 16);
      this.addModalScope.set('course');
      this.newSession = { subjectId: '', startTime: dt, endTime: dt };
      this.showAddModal.set(true);
    });
  }

  openAddSessionModal(): void {
    this.addModalScope.set('course');
    this.newSession = { subjectId: '', startTime: '', endTime: '' };
    this.showAddModal.set(true);
  }

  setAddModalScope(scope: 'course' | 'project'): void {
    if (this.addModalScope() === scope) return;
    this.addModalScope.set(scope);
    const ok = this.subjectsForAddModal().some((s) => s.id === this.newSession.subjectId);
    if (!ok) this.newSession.subjectId = '';
  }

  onEventDrop(info: any): void {
    this.zone.run(() => {
      const id = info.event.extendedProps['sessionId'];
      const s = this.planning.sessions().find((x) => x.id === id);
      if (!s) { info.revert(); return; }
      const start = info.event.start as Date;
      const end   = info.event.end   as Date;
      if (this.conflicts.hasConflict(this.planning.sessions(), id, start, end)) {
        info.revert();
        this.toast.show('Ce créneau chevauche une autre session.', 'error');
        return;
      }
      this.planning.updateSessionTimes(id, start, end);
      this.toast.show('Session déplacée.', 'info');
    });
  }

  onEventResize(info: any): void {
    this.zone.run(() => {
      const id    = info.event.extendedProps['sessionId'];
      const start = info.event.start as Date;
      const end   = info.event.end   as Date;
      if (this.conflicts.hasConflict(this.planning.sessions(), id, start, end)) {
        info.revert();
        this.toast.show('Impossible : conflit avec une autre session.', 'error');
        return;
      }
      this.planning.updateSessionTimes(id, start, end);
      this.toast.show('Durée mise à jour.', 'info');
    });
  }

  addSession(): void {
    if (!this.newSession.subjectId || !this.newSession.startTime || !this.newSession.endTime) return;

    const start = new Date(this.newSession.startTime);
    const end = new Date(this.newSession.endTime);
    if (this.conflicts.hasConflict(this.planning.sessions(), '__new__', start, end)) {
      this.toast.show('Ce créneau entre en conflit avec une session existante.', 'error');
      return;
    }

    // Sauvegarder en base pour avoir un vrai ID MongoDB
    this.planning.addSessionHttp({
      subjectId: this.newSession.subjectId,
      startTime: start,
      endTime: end,
      isCompleted: false,
    });

    this.showAddModal.set(false);
    this.addModalScope.set('course');
    this.newSession = { subjectId: '', startTime: '', endTime: '' };
    this.toast.show('Session ajoutée !');
  }

  confirmDraft(): void {
    this.planning.confirmDraftSchedule();
    this.toast.show('Planning validé : les sessions générées sont fixées.');
  }

  cancelDraft(): void {
    this.planning.cancelDraftSchedule();
    this.toast.show('Brouillon annulé.', 'info');
  }

  generateSchedule(): void {
    const prefs = this.auth.currentUser()?.preferences;
    this.planning.generateScheduleHttp(prefs?.restDayIndices ?? []).subscribe({
      next: (shortfalls) => {
        // Vérifier si un chevauchement a été détecté
        const overlap = this.planning.lastOverlapInfo();
        if (overlap) {
          const confirmed = window.confirm(
            `⚠️ Créneaux qui se chevauchent détectés !\n\n${overlap.overlapDetail}\n\n` +
            `• Cliquez "Annuler" pour corriger vos disponibilités\n` +
            `• Cliquez "OK" pour fusionner automatiquement et générer le planning`
          );
          if (confirmed) {
            this.planning.generateScheduleHttp(prefs?.restDayIndices ?? [], true).subscribe({
              next: () => this.toast.show('Planning généré avec fusion des créneaux.', 'warning'),
              error: () => this.toast.show('Erreur lors de la génération.', 'error')
            });
          } else {
            this.router.navigate(['/app/availabilities']);
          }
          return;
        }
        if (shortfalls.length) {
          this.toast.show('Planning généré avec des objectifs partiels. Consultez les détails ci-dessus.', 'warning');
        } else {
          this.toast.show('Planning généré avec succès !', 'success');
        }

        const completedSubjects = this.planning.lastCompletedPlanningInfo();
        if (completedSubjects.length) {
          const names = completedSubjects.map((x) => x.subjectName).join(', ');
          this.toast.show(`Sessions déjà terminées conservées: ${names}.`, 'info');
        }
      },
      error: () => {
        const shortfalls = this.planning.generateSchedule(prefs?.restDayIndices ?? []);
        if (shortfalls.length) {
          this.toast.show('Planning généré localement avec des objectifs partiels.', 'warning');
        } else {
          this.toast.show('Planning généré localement.', 'success');
        }
      },
    });
  }

  startAndClose(id: string): void {
    const s = this.selectedSession();
    if (s && new Date(s.endTime).getTime() < Date.now()) {
      this.toast.show('Cette session est déjà passée et ne peut pas être démarrée.', 'error');
      return;
    }
    this.planning.startSessionHttp(id);
    this.selectedSession.set(null);
    this.router.navigate(['/app/sessions/active', id]);
  }

  deleteSelectedSession(): void {
    const s = this.selectedSession();
    if (!s) return;
    this.planning.deleteSession(s.id);
    this.selectedSession.set(null);
    this.toast.show('Session supprimée.', 'info');
  }

  subjectName(id: string, fallback?: string): string {
    return this.planning.subjects().find((s) => s.id === id)?.name ?? fallback ?? '—';
  }

  subjectColor(id: string): string {
    return this.planning.subjects().find((s) => s.id === id)?.color ?? '#6366f1';
  }

  dismissShortfall(): void {
    this.planning.clearShortfall();
  }

  readonly courseShortfalls = computed(() =>
    this.planning.lastScheduleShortfall().filter(s => s.studyType !== 'project')
  );

  readonly projectShortfalls = computed(() =>
    this.planning.lastScheduleShortfall().filter(s => s.studyType === 'project')
  );

  readonly needsMoreAvailability = computed(() =>
    this.planning.lastScheduleShortfall().some(s => s.needsMoreAvailability)
  );

  /** Retourne true si la session sélectionnée est dans le passé (computed signal) */
  readonly selectedSessionExpired = computed(() => {
    const s = this.selectedSession();
    if (!s) return false;
    // endTime est garanti Date grâce à onEventClick
    return s.endTime.getTime() < Date.now();
  });
}
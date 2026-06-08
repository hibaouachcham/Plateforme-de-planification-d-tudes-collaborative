import { Component, inject, signal, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { PlanningService } from '../../../core/services/planning.service';
import { Availability } from '../../../core/models/subject.model';
import { ToastService } from '../../../core/services/toast.service';
import { API_PATHS } from '../../../core/api/api.constants';
import { AuthService } from '../../../core/services/auth.service';

/** Jours au format JavaScript getDay() : 0 = dimanche … 6 = samedi */
const WEEK_DAYS: { dow: number; label: string }[] = [
  { dow: 1, label: 'Lundi' },
  { dow: 2, label: 'Mardi' },
  { dow: 3, label: 'Mercredi' },
  { dow: 4, label: 'Jeudi' },
  { dow: 5, label: 'Vendredi' },
  { dow: 6, label: 'Samedi' },
  { dow: 0, label: 'Dimanche' },
];

@Component({
  selector: 'app-availabilities-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-8 fade-in max-w-4xl">
      <div>
        <div class="flex items-center gap-3">
          <h1 class="text-3xl font-black text-slate-900 dark:text-white">Disponibilités</h1>
          @if (isAutoSaving()) {
            <div class="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <span class="material-icons text-base animate-spin">sync</span>
              <span class="text-sm font-medium">Sauvegarde...</span>
            </div>
          }
        </div>
        <p class="text-slate-500 dark:text-slate-400 mt-1">
          Définissez vos créneaux récurrents par jour de la semaine (CDC §4.2.1). Ils alimentent la génération du planning.
          <span class="text-emerald-600 dark:text-emerald-400 font-medium">✓ Sauvegarde automatique</span>
        </p>
      </div>

      <!-- Loading state -->
      @if (isLoading()) {
        <div class="flex items-center justify-center py-16">
          <div class="flex items-center gap-3 text-slate-400 dark:text-slate-500">
            <span class="material-icons animate-spin">refresh</span>
            <span class="text-sm font-medium">Chargement des disponibilités…</span>
          </div>
        </div>
      } @else if (!isPreviewMode()) {
        <!-- Récapitulatif heures en mode édition -->
        <div class="flex items-center gap-4 px-5 py-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800">
          <span class="material-icons text-indigo-500">timer</span>
          <div class="flex-1">
            <p class="text-sm font-black text-indigo-700 dark:text-indigo-300">
              Total : {{ totalEditHours() }}h disponibles cette semaine
            </p>
            <p class="text-xs text-indigo-500 dark:text-indigo-400 font-medium">
              {{ totalEditSlots() }} créneau{{ totalEditSlots() > 1 ? 'x' : '' }} sur {{ activeDaysCount() }} jour{{ activeDaysCount() > 1 ? 's' : '' }}
            </p>
          </div>
          @if (totalEditHours() > 0) {
            <div class="flex gap-1">
              @for (day of weekDays; track day.dow) {
                <div [class]="slotsForDay(day.dow).length > 0
                  ? 'w-5 h-5 rounded-md bg-indigo-500 dark:bg-indigo-400 flex items-center justify-center'
                  : 'w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-700'"
                     [title]="day.label + ' : ' + dayHours(day.dow) + 'h'">
                  @if (slotsForDay(day.dow).length > 0) {
                    <span class="text-[8px] font-black text-white">{{ dayHours(day.dow) }}</span>
                  }
                </div>
              }
            </div>
          }
        </div>

        <div class="space-y-4">
          @for (day of weekDays; track day.dow) {
            <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                  <h3 class="text-lg font-black text-slate-900 dark:text-white">{{ day.label }}</h3>
                  @if (isRestDay(day.dow)) {
                    <span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                      Jour de repos
                    </span>
                  }
                </div>
                <button type="button" (click)="addSlot(day.dow)"
                        class="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                  <span class="material-icons text-base">add</span>
                  Ajouter un créneau
                </button>
              </div>
              @if (slotsForDay(day.dow).length === 0) {
                <p class="text-sm text-slate-400 dark:text-slate-500 italic">Aucun créneau ce jour.</p>
              } @else {
                <div class="space-y-3">
                  @for (slot of slotsForDay(day.dow); track trackSlot(slot)) {
                    <div class="flex flex-wrap items-end gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700">
                      <div class="flex-1 min-w-[120px]">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Début</label>
                        <select [(ngModel)]="slot.startTime" [name]="'s'+slot._key+'-start'"
                                (ngModelChange)="onTimeChange()"
                                class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white">
                          @for (h of timeOptions; track h.value) {
                            <option [value]="h.value">{{ h.label }}</option>
                          }
                        </select>
                      </div>
                      <div class="flex-1 min-w-[120px]">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Fin</label>
                        <select [(ngModel)]="slot.endTime" [name]="'s'+slot._key+'-end'"
                                (ngModelChange)="onTimeChange()"
                                class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white">
                          @for (h of timeOptions; track h.value) {
                            <option [value]="h.value">{{ h.label }}</option>
                          }
                        </select>
                      </div>
                      <button type="button" (click)="removeSlot(slot)"
                              class="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition-all mb-0.5"
                              title="Supprimer">
                        <span class="material-icons text-xl">delete_outline</span>
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>

        <!-- Info sur la sauvegarde automatique -->
        <div class="bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
          <div class="flex items-center gap-3">
            <span class="material-icons text-emerald-600 dark:text-emerald-400">check_circle</span>
            <div>
              <p class="text-sm font-bold text-emerald-800 dark:text-emerald-200">Sauvegarde automatique activée</p>
              <p class="text-xs text-emerald-600 dark:text-emerald-400">Vos modifications sont enregistrées automatiquement et prises en compte par l'algorithme de planning.</p>
            </div>
          </div>
        </div>

      @if (hasSlotsOnRestDays()) {
        <div class="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
          <div class="flex items-start gap-3">
            <span class="material-icons text-amber-600 dark:text-amber-400">warning</span>
            <div>
              <p class="text-sm font-bold text-amber-800 dark:text-amber-200">
                Certains créneaux sont sur des jours de repos.
              </p>
              <p class="text-xs text-amber-700 dark:text-amber-300">
                Ces créneaux sont enregistrés, mais ignorés pendant la génération automatique du planning.
              </p>
            </div>
          </div>
        </div>
      }
      } @else {
        <!-- Preview mode -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-6">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="text-xl font-black text-slate-900 dark:text-white">Aperçu de vos disponibilités</h3>
              <p class="text-sm text-slate-500 dark:text-slate-400">Vue hebdomadaire (06h → 24h)</p>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <!-- Total heures semaine -->
              <div class="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800">
                <span class="material-icons text-indigo-500 text-base">timer</span>
                <span class="text-sm font-black text-indigo-700 dark:text-indigo-300">
                  {{ totalPreviewHours() }}h disponibles / semaine
                </span>
                <span class="text-xs text-indigo-400 dark:text-indigo-500 font-medium">
                  ({{ totalPreviewSlots() }} créneau{{ totalPreviewSlots() > 1 ? 'x' : '' }})
                </span>
              </div>
              <button type="button" (click)="editSaved()"
                      class="px-4 py-2.5 rounded-xl text-sm font-bold border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-all">
                Modifier
              </button>
              <button type="button" (click)="clearAndRestart()"
                      class="px-4 py-2.5 rounded-xl text-sm font-bold border border-rose-200 dark:border-rose-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 transition-all">
                Supprimer et recommencer
              </button>
            </div>
          </div>

          <div class="overflow-x-auto">
            <div class="min-w-[760px] space-y-4">
              <div class="ml-36 pr-2 grid grid-cols-7 gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <span>06h</span><span>09h</span><span>12h</span><span>15h</span><span>18h</span><span>21h</span><span>24h</span>
              </div>
              @for (day of weekDays; track day.dow) {
                <div class="flex items-center gap-3">
                  <div class="w-32 shrink-0">
                    <p class="font-black text-slate-800 dark:text-slate-100">{{ day.label }}</p>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400">
                      {{ previewSlotsForDay(day.dow).length }} créneau(x)
                    </p>
                  </div>
                  <div class="relative h-14 flex-1 rounded-2xl border border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-indigo-50/50 dark:from-slate-800 dark:to-indigo-950/40 overflow-hidden">
                    @if (!previewSlotsForDay(day.dow).length) {
                      <div class="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-400 dark:text-slate-500">
                        indisponible
                      </div>
                    } @else {
                      @for (slot of previewSlotsForDay(day.dow); track slot.startTime + '-' + slot.endTime) {
                        <div class="absolute top-2 h-10 rounded-xl bg-indigo-500/90 text-white text-[11px] font-bold px-2 flex items-center justify-center shadow-md"
                             [style.left]="slotStyle(slot).left"
                             [style.width]="slotStyle(slot).width">
                          {{ slot.startTime }} - {{ slot.endTime }} ({{ slotDuration(slot) }})
                        </div>
                      }
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AvailabilitiesPageComponent implements OnInit, OnDestroy {
  planning = inject(PlanningService);
  toast    = inject(ToastService);
  auth     = inject(AuthService);
  private http = inject(HttpClient);

  weekDays      = WEEK_DAYS;
  isPreviewMode = signal(false);
  isLoading     = signal(false);
  isSaving      = signal(false);
  isAutoSaving  = signal(false);
  savedPreview  = signal<Availability[]>([]);

  /** Options d'heures en format 24h, par pas de 30 min (00:00 → 23:30) */
  readonly timeOptions: { value: string; label: string }[] = (() => {
    const opts = [];
    for (let h = 0; h < 24; h++) {
      for (const m of [0, 30]) {
        const hh = String(h).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        const label = `${hh}h${mm}`;
        opts.push({ value: `${hh}:${mm}`, label });
      }
    }
    return opts;
  })();

  /** Créneaux éditables (clé stable pour trackBy) */
  private _slots = signal<EditableSlot[]>([]);

  constructor() {
    // Réagit aux changements du signal planning.availabilities()
    // (ex: chargement initial depuis le backend après login)
    effect(() => {
      const avails = this.planning.availabilities();
      // Ne pas écraser si l'utilisateur est en train d'éditer
      if (!this.isPreviewMode() && this._slots().length === 0 && avails.length > 0) {
        this.applyAvailabilities(avails);
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.loadFromBackend();
  }

  ngOnDestroy(): void {
    // Nettoie le timeout pour éviter les fuites mémoire
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
  }

  /** Charge directement depuis le backend — source de vérité. */
  private loadFromBackend(): void {
    this.isLoading.set(true);
    this.http.get<Availability[]>(API_PATHS.availabilities).subscribe({
      next: (data) => {
        // Met à jour le signal global du planning service
        this.planning.setAvailabilities(data);
        this.applyAvailabilities(data);
        this.isLoading.set(false);
      },
      error: () => {
        // Fallback sur le cache local si le backend est indisponible
        this.applyAvailabilities(this.planning.availabilities());
        this.isLoading.set(false);
      },
    });
  }

  private applyAvailabilities(avails: Availability[]): void {
    const normalized = avails.map((a) => ({
      dayOfWeek: a.dayOfWeek,
      startTime: normalizeTime(a.startTime),
      endTime:   normalizeTime(a.endTime),
    }));
    this._slots.set(
      normalized.map((a, i) => ({
        _key: `loaded-${i}-${a.dayOfWeek}-${a.startTime}`,
        ...a,
      }))
    );
    this.savedPreview.set(normalized);
    this.isPreviewMode.set(avails.length > 0);
  }

  slotsForDay(dow: number): EditableSlot[] {
    return this._slots().filter((s) => s.dayOfWeek === dow);
  }

  trackSlot(s: EditableSlot): string {
    return s._key;
  }

  addSlot(dow: number): void {
    const key = `k${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this._slots.update((list) => [
      ...list,
      { _key: key, dayOfWeek: dow, startTime: '18:00', endTime: '20:00' },
    ]);
    // Sauvegarde automatique après ajout
    this.autoSave();
  }

  removeSlot(slot: EditableSlot): void {
    this._slots.update((list) => list.filter((s) => s._key !== slot._key));
    // Sauvegarde automatique après suppression
    this.autoSave();
  }

  /** Sauvegarde automatique avec debounce pour éviter trop d'appels */
  private autoSaveTimeout: any = null;
  
  private autoSave(): void {
    // Annule la sauvegarde précédente si elle est en attente
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    
    this.isAutoSaving.set(true);
    
    // Déclenche la sauvegarde après 1 seconde d'inactivité
    this.autoSaveTimeout = setTimeout(() => {
      this.saveInternal(true); // true = sauvegarde automatique
    }, 1000);
  }

  /** Appelé quand l'utilisateur modifie les heures */
  onTimeChange(): void {
    this.autoSave();
  }

  /** Recharge depuis le backend et annule les modifications locales. */
  resetFromBackend(): void {
    this.loadFromBackend();
  }

  save(): void {
    this.saveInternal(false); // false = sauvegarde manuelle
  }

  private saveInternal(isAutoSave: boolean): void {
    const list = this._slots();

    // Validation : fin > début
    for (const s of list) {
      if (s.startTime >= s.endTime) {
        if (!isAutoSave) {
          this.toast.show(`Créneau invalide : l'heure de fin doit être après le début.`, 'error');
        }
        this.isAutoSaving.set(false);
        return;
      }
    }

    // Validation : pas de chevauchement entre créneaux du même jour
    const byDay = new Map<number, EditableSlot[]>();
    for (const s of list) {
      if (!byDay.has(s.dayOfWeek)) byDay.set(s.dayOfWeek, []);
      byDay.get(s.dayOfWeek)!.push(s);
    }
    for (const [, slots] of byDay) {
      const sorted = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
      for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].endTime > sorted[i + 1].startTime) {
          if (!isAutoSave) {
            this.toast.show(
              `Chevauchement détecté : deux créneaux du même jour se superposent. Corrigez-les avant de sauvegarder.`,
              'error'
            );
          }
          this.isAutoSaving.set(false);
          return;
        }
      }
    }

    const payload: Availability[] = list.map(({ dayOfWeek, startTime, endTime }) => ({
      dayOfWeek,
      startTime,
      endTime,
    }));

    if (!isAutoSave) {
      this.isSaving.set(true);
    }

    this.http.post<Availability[]>(API_PATHS.availabilities, payload).subscribe({
      next: (saved) => {
        const normalized = saved.map((a) => ({
          dayOfWeek: a.dayOfWeek,
          startTime: normalizeTime(a.startTime),
          endTime:   normalizeTime(a.endTime),
        }));
        // Mettre à jour le signal global pour que l'algorithme les utilise
        this.planning.setAvailabilities(normalized);
        this.savedPreview.set(normalized);
        
        // Notifier que les disponibilités ont changé pour déclencher une régénération si nécessaire
        this.notifyAvailabilitiesChanged();
        
        if (isAutoSave) {
          this.isAutoSaving.set(false);
          // Pas de toast pour la sauvegarde automatique
        } else {
          this.isPreviewMode.set(true);
          this.isSaving.set(false);
          this.toast.show('Disponibilités enregistrées.');
        }
      },
      error: () => {
        if (isAutoSave) {
          this.isAutoSaving.set(false);
        } else {
          this.isSaving.set(false);
          this.toast.show('Erreur lors de la sauvegarde. Réessayez.', 'error');
        }
      },
    });
  }

  editSaved(): void {
    const saved = this.savedPreview();
    this._slots.set(
      saved.map((a, i) => ({
        _key: `saved-${i}-${a.dayOfWeek}-${a.startTime}`,
        dayOfWeek: a.dayOfWeek,
        startTime: normalizeTime(a.startTime),
        endTime:   normalizeTime(a.endTime),
      }))
    );
    this.isPreviewMode.set(false);
  }

  clearAndRestart(): void {
    this.isSaving.set(true);
    this.http.post<Availability[]>(API_PATHS.availabilities, []).subscribe({
      next: () => {
        this.planning.setAvailabilities([]);
        this._slots.set([]);
        this.savedPreview.set([]);
        this.isPreviewMode.set(false);
        this.isSaving.set(false);
        this.toast.show('Disponibilités supprimées. Vous pouvez les refaire.', 'info');
      },
      error: () => {
        this.isSaving.set(false);
        this.toast.show('Erreur lors de la suppression.', 'error');
      },
    });
  }

  previewSlotsForDay(dow: number): Availability[] {
    return this.savedPreview().filter((s) => s.dayOfWeek === dow);
  }

  isRestDay(dow: number): boolean {
    return (this.auth.currentUser()?.preferences?.restDayIndices ?? []).includes(dow);
  }

  hasSlotsOnRestDays(): boolean {
    const restDays = this.auth.currentUser()?.preferences?.restDayIndices ?? [];
    if (!restDays.length) return false;
    return this._slots().some((s) => restDays.includes(s.dayOfWeek));
  }

  /** Notifie que les disponibilités ont changé */
  private notifyAvailabilitiesChanged(): void {
    // Si l'utilisateur a des sessions brouillon auto-générées, on peut les régénérer
    if (this.planning.hasDraftAutoSessions()) {
      this.toast.show('Disponibilités mises à jour. Régénérez votre planning pour voir les changements.', 'info');
    }
  }

  // ── Totaux heures disponibles ─────────────────────────────────────────

  /** Total des heures en mode prévisualisation (savedPreview) */
  totalPreviewHours(): number {
    return +(this.savedPreview()
      .reduce((a, s) => a + Math.max(0, toMinutes(s.endTime) - toMinutes(s.startTime)), 0) / 60
    ).toFixed(1);
  }

  totalPreviewSlots(): number {
    return this.savedPreview().length;
  }

  /** Total des heures en mode édition (_slots) */
  totalEditHours(): number {
    return +(this._slots()
      .reduce((a, s) => a + Math.max(0, toMinutes(s.endTime) - toMinutes(s.startTime)), 0) / 60
    ).toFixed(1);
  }

  totalEditSlots(): number {
    return this._slots().length;
  }

  /** Nombre de jours ayant au moins un créneau */
  activeDaysCount(): number {
    return new Set(this._slots().map(s => s.dayOfWeek)).size;
  }

  /** Heures disponibles pour un jour donné (en mode édition) */
  dayHours(dow: number): number {
    return +(this._slots()
      .filter(s => s.dayOfWeek === dow)
      .reduce((a, s) => a + Math.max(0, toMinutes(s.endTime) - toMinutes(s.startTime)), 0) / 60
    ).toFixed(1);
  }

  slotStyle(slot: Availability): SlotStyle {
    const start    = toMinutes(slot.startTime);
    const end      = toMinutes(slot.endTime);
    const dayStart = 6 * 60;   // 06:00
    const dayEnd   = 24 * 60;  // 24:00
    const total    = dayEnd - dayStart;
    const clampedStart = Math.max(dayStart, Math.min(dayEnd, start));
    const clampedEnd   = Math.max(dayStart, Math.min(dayEnd, end));
    const left  = ((clampedStart - dayStart) / total) * 100;
    const width = Math.max(2, ((clampedEnd - clampedStart) / total) * 100);
    return { left: `${left}%`, width: `${width}%` };
  }

  slotDuration(slot: Availability): string {
    const mins = Math.max(0, toMinutes(slot.endTime) - toMinutes(slot.startTime));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
  }
}

interface EditableSlot extends Availability {
  _key: string;
}

interface SlotStyle {
  left: string;
  width: string;
}

function normalizeTime(t: string): string {
  if (!t) return '09:00';
  if (t === '24:00') return '24:00';
  const parts = t.split(':');
  const h = (parts[0] ?? '09').padStart(2, '0');
  const m = (parts[1] ?? '00').padStart(2, '0').slice(0, 2);
  return `${h}:${m}`;
}

function toMinutes(t: string): number {
  const [hh, mm] = t.split(':').map((x) => Number(x));
  return (hh || 0) * 60 + (mm || 0);
}
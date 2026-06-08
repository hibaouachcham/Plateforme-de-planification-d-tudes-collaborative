import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlanningService } from '../../../core/services/planning.service';
import { ToastService } from '../../../core/services/toast.service';
import { Subject, Priority } from '../../../core/models/subject.model';

const PALETTE = ['#6366f1','#ec4899','#10b981','#f59e0b','#8b5cf6','#06b6d4'];

@Component({
  selector: 'app-subjects-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-8 fade-in">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-black text-slate-900 dark:text-white">Mes Matières</h1>
          <p class="text-slate-500 dark:text-slate-400 mt-1">
            Uniquement les <strong>cours</strong>. Les projets se gèrent dans <strong>Mes Projets</strong>.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <!-- Search -->
          <div class="relative">
            <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-base">search</span>
            <input type="text" 
                   [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)"
                   placeholder="Rechercher une matière..."
                   class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm font-bold
                          text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all
                          placeholder-slate-400 dark:placeholder-slate-500 w-56" />
          </div>
          <select [ngModel]="filterPriority()" (ngModelChange)="filterPriority.set($event)"
                  class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold
                         text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all">
            <option value="">Toutes les priorités</option>
            <option value="Haute">Haute</option>
            <option value="Moyenne">Moyenne</option>
            <option value="Basse">Basse</option>
          </select>
          <button (click)="openAdd()"
                  class="bg-indigo-600 text-white px-5 py-3 rounded-2xl font-bold
                         hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2">
            <span class="material-icons text-lg">add</span>
            Ajouter une matière
          </button>
        </div>
      </div>

      <!-- Cards grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @for (s of filtered(); track s.id) {
          <div class="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
            <!-- Top row: icon + badge -->
            <div class="flex items-center justify-between mb-6">
              <div class="w-14 h-14 rounded-2xl flex items-center justify-center"
                   [style.background]="s.color + '18'">
                <span class="material-icons text-2xl" [style.color]="s.color">menu_book</span>
              </div>
              <span [class]="priorityBadge(s.priority)">{{ s.priority }}</span>
            </div>

            <!-- Subject name -->
            <div class="mb-4">
              <h3 class="text-xl font-bold text-slate-900 dark:text-white">{{ s.name }}</h3>
              <span [class]="(s.workMode ?? 'private') === 'group'
                ? 'mt-1 inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                : 'mt-1 inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'">
                <span class="material-icons text-[10px]">{{ (s.workMode ?? 'private') === 'group' ? 'groups' : 'lock' }}</span>
                {{ (s.workMode ?? 'private') === 'group' ? 'Groupe' : 'Privé' }}
              </span>
            </div>

            <!-- Progress -->
            <div class="space-y-2 mb-6">
              <div class="flex justify-between text-sm">
                <span class="text-slate-500 dark:text-slate-400 font-medium">Objectif Hebdo</span>
                <span class="text-slate-900 dark:text-white font-bold">{{ s.weeklyGoalHours }}h</span>
              </div>
              <div class="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all"
                     [style.width.%]="progressPct(s.id, s.weeklyGoalHours)"
                     [style.background]="s.color">
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-700">
              <button (click)="openEdit(s)"
                      class="text-sm font-bold text-indigo-600 hover:underline transition-all">
                Modifier
              </button>
              <button (click)="deleteSubject(s.id)"
                      class="text-sm font-bold text-slate-400 dark:text-slate-500 hover:text-rose-600 transition-colors">
                Supprimer
              </button>
            </div>
          </div>
        } @empty {
          <div class="col-span-3 text-center py-16">
            <span class="material-icons text-5xl text-slate-200 dark:text-slate-700 block mb-3">menu_book</span>
            <p class="text-slate-400 dark:text-slate-500 font-medium">Aucune matière. Ajoutez-en une !</p>
          </div>
        }
      </div>
    </div>

    <!-- Add / Edit modal -->
    @if (showModal()) {
      <div class="fixed inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center fade-in"
           (click)="closeModal()">
        <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 w-full max-w-md mx-4 border border-slate-200 dark:border-slate-700"
             (click)="$event.stopPropagation()">
          <h3 class="text-2xl font-black text-slate-900 dark:text-white mb-6">
            {{ editing() ? 'Modifier la Matière' : 'Nouvelle Matière' }}
          </h3>
          <form (ngSubmit)="save()" class="space-y-5">
            <!-- Name -->
            <div>
              <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nom de la matière</label>
              <input [(ngModel)]="form.name" name="name" type="text"
                     placeholder="ex: Intelligence Artificielle"
                     class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm
                            text-slate-900 dark:text-white
                            focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
            </div>

            <p class="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2">
              <span class="material-icons text-base text-indigo-500 flex-shrink-0">info</span>
              <span>Cette fiche concerne un <strong>cours</strong> (matière). Pour planifier un travail de type projet, créez-le depuis la page <strong>Projets</strong> du menu.</span>
            </p>

            <div>
              <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Mode de travail</label>
              <div class="grid grid-cols-2 gap-2">
                <label [class]="form.workMode === 'private'
                  ? 'px-3 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-black cursor-pointer text-center'
                  : 'px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-600 dark:text-slate-300 cursor-pointer text-center'">
                  <input type="radio" class="sr-only" name="workMode" [(ngModel)]="form.workMode" value="private" />
                  Privé (personnel)
                </label>
                <label [class]="form.workMode === 'group'
                  ? 'px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black cursor-pointer text-center'
                  : 'px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-600 dark:text-slate-300 cursor-pointer text-center'">
                  <input type="radio" class="sr-only" name="workMode" [(ngModel)]="form.workMode" value="group" />
                  En groupe
                </label>
              </div>
            </div>

            <!-- Priority + Hours -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Priorité</label>
                <select [(ngModel)]="form.priority" name="priority"
                        class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm
                               text-slate-900 dark:text-white
                               focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all appearance-none">
                  <option value="Haute">Haute</option>
                  <option value="Moyenne">Moyenne</option>
                  <option value="Basse">Basse</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Heures / Semaine</label>
                <input [(ngModel)]="form.weeklyGoalHours" name="hours" type="number" min="1" max="40"
                       class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm
                              text-slate-900 dark:text-white
                              focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
              </div>
            </div>

            <!-- Durées de session (CDC §3.1 Subject) -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Durée min (min)</label>
                <input [(ngModel)]="form.minSessionMin" name="minSess" type="number" min="15" max="180" step="5"
                       class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm
                              text-slate-900 dark:text-white
                              focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
              </div>
              <div>
                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Durée max (min)</label>
                <input [(ngModel)]="form.maxSessionMin" name="maxSess" type="number" min="30" max="300" step="5"
                       class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm
                              text-slate-900 dark:text-white
                              focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
              </div>
            </div>
            <p class="text-xs text-slate-400 dark:text-slate-500">Utilisées par la génération automatique du planning.</p>

            <!-- Color picker -->
            <div>
              <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Couleur</label>
              <div class="flex gap-3 flex-wrap">
                @for (c of palette; track c) {
                  <button type="button" (click)="form.color = c"
                          [style.background]="c"
                          [class]="form.color === c
                            ? 'w-10 h-10 rounded-full ring-2 ring-offset-2 ring-indigo-600 scale-110 transition-all'
                            : 'w-10 h-10 rounded-full hover:scale-110 transition-all'">
                  </button>
                }
              </div>
            </div>

            <!-- Actions -->
            <div class="flex justify-between items-center pt-2">
              <button type="button" (click)="closeModal()"
                      class="text-slate-500 dark:text-slate-400 font-bold hover:text-slate-700 dark:hover:text-slate-200 transition-colors px-4 py-2">
                Annuler
              </button>
              <button type="submit"
                      class="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all">
                {{ editing() ? 'Enregistrer' : 'Ajouter' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class SubjectsPageComponent {
  planning = inject(PlanningService);
  toast    = inject(ToastService);

  filterPriority = signal('');
  searchQuery    = signal('');
  showModal = signal(false);
  editing   = signal<Subject | null>(null);
  palette   = PALETTE;

  form = {
    name: '',
    color: '#6366f1',
    priority: 'Moyenne' as Priority,
    weeklyGoalHours: 5,
    workMode: 'private' as 'private' | 'group',
    minSessionMin: 45,
    maxSessionMin: 120,
  };

  filtered = computed(() => {
    const priority = this.filterPriority();
    const query = this.searchQuery().toLowerCase().trim();
    return this.planning.subjects().filter((s) => {
      if ((s.studyType ?? 'course') === 'project') return false;
      const matchPriority = !priority || s.priority === priority;
      const matchSearch = !query || s.name.toLowerCase().includes(query);
      return matchPriority && matchSearch;
    });
  });

  priorityBadge(p: Priority): string {
    const base = 'text-xs font-black uppercase px-3 py-1 rounded-full';
    return p === 'Haute'   ? `${base} bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400`
         : p === 'Moyenne' ? `${base} bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400`
         :                   `${base} bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400`;
  }

  progressPct(id: string, goal: number): number {
    const done = this.planning.sessions()
      .filter((s) => s.subjectId === id && s.isCompleted)
      .reduce((a, s) => a + (s.endTime.getTime() - s.startTime.getTime()) / 3_600_000, 0);
    return Math.min(100, Math.round((done / goal) * 100));
  }

  openAdd(): void {
    this.editing.set(null);
    this.form = {
      name: '',
      color: '#6366f1',
      priority: 'Moyenne',
      weeklyGoalHours: 5,
      workMode: 'private',
      minSessionMin: 45,
      maxSessionMin: 120,
    };
    this.showModal.set(true);
  }

  openEdit(s: Subject): void {
    this.editing.set(s);
    this.form = {
      name: s.name,
      color: s.color,
      priority: s.priority,
      weeklyGoalHours: s.weeklyGoalHours,
      workMode: s.workMode ?? 'private',
      minSessionMin: s.minSessionMin ?? 45,
      maxSessionMin: s.maxSessionMin ?? 120,
    };
    this.showModal.set(true);
  }

  closeModal(): void { 
    this.showModal.set(false); 
    this.editing.set(null); 
  }

  save(): void {
    if (!this.form.name.trim()) return;
    if (this.form.minSessionMin > this.form.maxSessionMin) {
      this.toast.show('La durée minimale doit être inférieure ou égale à la durée maximale.', 'error');
      return;
    }
    const ed = this.editing();
    const asCourse: Omit<Subject, 'id'> = { ...this.form, studyType: 'course' };
    if (ed) {
      this.planning.updateSubjectHttp({ ...ed, ...asCourse });
      this.toast.show('Matière mise à jour.');
    } else {
      this.planning.addSubjectHttp(asCourse);
      this.toast.show('Matière ajoutée avec succès !');
    }
    this.closeModal();
  }

  deleteSubject(id: string): void {
    this.planning.deleteSubjectHttp(id);
    this.toast.show('Matière supprimée.', 'info');
  }
}
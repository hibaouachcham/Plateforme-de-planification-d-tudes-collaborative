import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { PlanningService } from '../../../core/services/planning.service';
import { ToastService } from '../../../core/services/toast.service';
import { Availability, Priority } from '../../../core/models/subject.model';

type Day = { dow: number; label: string };
const DAYS: Day[] = [
  { dow: 1, label: 'Lundi' },
  { dow: 2, label: 'Mardi' },
  { dow: 3, label: 'Mercredi' },
  { dow: 4, label: 'Jeudi' },
  { dow: 5, label: 'Vendredi' },
  { dow: 6, label: 'Samedi' },
  { dow: 0, label: 'Dimanche' },
];

@Component({
  selector: 'app-onboarding-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-5xl mx-auto py-8 px-4 space-y-6 fade-in">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm">
        <p class="text-xs font-black uppercase tracking-wider text-indigo-500 mb-2">Première configuration</p>
        <h1 class="text-3xl font-black text-slate-900 dark:text-white">Bienvenue {{ auth.currentUser()?.name }}</h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">
          Pour votre première connexion, terminez ces 3 étapes : disponibilités, cours/projets, puis génération automatique de votre planning.
        </p>
        <div class="mt-5 grid grid-cols-3 gap-2">
          @for (n of [1,2,3]; track n) {
            <div [class]="step() >= n
              ? 'h-2 rounded-full bg-indigo-600'
              : 'h-2 rounded-full bg-slate-200 dark:bg-slate-700'"></div>
          }
        </div>
      </div>

      @if (step() === 1) {
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm space-y-5">
          <h2 class="text-xl font-black text-slate-900 dark:text-white">1) Disponibilités + jour libre</h2>
          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <label class="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Jour libre principal</label>
              <select [(ngModel)]="restDay"
                      class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm">
                @for (d of days; track d.dow) {
                  <option [ngValue]="d.dow">{{ d.label }}</option>
                }
              </select>
            </div>
          </div>

          <div class="space-y-3">
            @for (d of days; track d.dow) {
              <div class="rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                <div class="flex items-center justify-between mb-2">
                  <p class="font-bold text-slate-900 dark:text-white">{{ d.label }}</p>
                  <button type="button" (click)="addAvailability(d.dow)" class="text-sm font-bold text-indigo-600 dark:text-indigo-400">+ Ajouter</button>
                </div>
                @if (slotsForDay(d.dow).length === 0) {
                  <p class="text-xs text-slate-400 italic">Aucun créneau</p>
                } @else {
                  <div class="space-y-2">
                    @for (s of slotsForDay(d.dow); track s.key) {
                      <div class="flex items-center gap-2">
                        <input type="time" [(ngModel)]="s.startTime" class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-sm" />
                        <span class="text-slate-400">→</span>
                        <input type="time" [(ngModel)]="s.endTime" class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-sm" />
                        <button type="button" (click)="removeSlot(s.key)" class="text-rose-500 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950">
                          <span class="material-icons text-base">delete_outline</span>
                        </button>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }

      @if (step() === 2) {
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm space-y-5">
          <h2 class="text-xl font-black text-slate-900 dark:text-white">2) Cours et projets</h2>

          <div class="grid md:grid-cols-2 gap-4">
            <div class="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
              <h3 class="font-black text-slate-900 dark:text-white">Ajouter un cours</h3>
              <input [(ngModel)]="courseForm.name" placeholder="Nom du cours" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm" />
              <div class="grid grid-cols-2 gap-2">
                <select [(ngModel)]="courseForm.priority" class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm">
                  <option value="Haute">Haute</option><option value="Moyenne">Moyenne</option><option value="Basse">Basse</option>
                </select>
                <input [(ngModel)]="courseForm.weeklyGoalHours" type="number" min="1" max="30" class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm" />
              </div>
              <div class="grid grid-cols-2 gap-2">
                <label [class]="courseForm.workMode === 'private'
                  ? 'px-3 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-black cursor-pointer text-center'
                  : 'px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-600 dark:text-slate-300 cursor-pointer text-center'">
                  <input type="radio" class="sr-only" name="courseWorkMode" [(ngModel)]="courseForm.workMode" value="private" />
                  Privé (personnel)
                </label>
                <label [class]="courseForm.workMode === 'group'
                  ? 'px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black cursor-pointer text-center'
                  : 'px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-600 dark:text-slate-300 cursor-pointer text-center'">
                  <input type="radio" class="sr-only" name="courseWorkMode" [(ngModel)]="courseForm.workMode" value="group" />
                  En groupe
                </label>
              </div>
              <button type="button" (click)="addCourse()" class="w-full rounded-xl bg-indigo-600 text-white py-2.5 font-bold text-sm hover:bg-indigo-700">Ajouter le cours</button>
            </div>

            <div class="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
              <h3 class="font-black text-slate-900 dark:text-white">Ajouter un projet</h3>
              <input [(ngModel)]="projectForm.name" placeholder="Nom du projet" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm" />
              <div class="grid grid-cols-2 gap-2">
                <select [(ngModel)]="projectForm.priority" class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm">
                  <option value="Haute">Haute</option><option value="Moyenne">Moyenne</option><option value="Basse">Basse</option>
                </select>
                <input [(ngModel)]="projectForm.weeklyGoalHours" type="number" min="1" max="30" class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm" />
              </div>
              <div class="grid grid-cols-2 gap-2">
                <label [class]="projectForm.workMode === 'private'
                  ? 'px-3 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-black cursor-pointer text-center'
                  : 'px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-600 dark:text-slate-300 cursor-pointer text-center'">
                  <input type="radio" class="sr-only" name="projectWorkMode" [(ngModel)]="projectForm.workMode" value="private" />
                  Privé (personnel)
                </label>
                <label [class]="projectForm.workMode === 'group'
                  ? 'px-3 py-2 rounded-xl bg-amber-600 text-white text-xs font-black cursor-pointer text-center'
                  : 'px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-600 dark:text-slate-300 cursor-pointer text-center'">
                  <input type="radio" class="sr-only" name="projectWorkMode" [(ngModel)]="projectForm.workMode" value="group" />
                  En groupe
                </label>
              </div>
              <button type="button" (click)="addProject()" class="w-full rounded-xl bg-amber-600 text-white py-2.5 font-bold text-sm hover:bg-amber-700">Ajouter le projet</button>
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
            <p class="text-sm font-bold text-slate-900 dark:text-white mb-2">Éléments ajoutés ({{ planning.subjects().length }})</p>
            @if (planning.subjects().length === 0) {
              <p class="text-xs text-slate-400 italic">Ajoutez au moins un cours ou un projet.</p>
            } @else {
              <div class="flex flex-wrap gap-2">
                @for (s of planning.subjects(); track s.id) {
                  <span class="text-xs font-bold px-2.5 py-1 rounded-full"
                        [class]="(s.studyType ?? 'course') === 'project'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                          : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400'">
                    {{ s.name }} · {{ (s.studyType ?? 'course') === 'project' ? 'Projet' : 'Cours' }} · {{ (s.workMode ?? 'private') === 'group' ? 'Groupe' : 'Privé' }}
                  </span>
                }
              </div>
            }
          </div>
        </div>
      }

      @if (step() === 3) {
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm space-y-5">
          <h2 class="text-xl font-black text-slate-900 dark:text-white">3) Génération du planning</h2>
          <p class="text-slate-500 dark:text-slate-400">
            Cliquez pour générer automatiquement vos sessions selon vos disponibilités, vos priorités et votre jour libre.
          </p>

          <div class="flex flex-wrap gap-3">
            <button type="button" (click)="generate()"
                    class="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700">
              Générer mon planning
            </button>
            <button type="button" (click)="finish()"
                    [disabled]="!generated()"
                    class="px-5 py-2.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 disabled:opacity-40">
              Terminer l’onboarding
            </button>
          </div>

          @if (generated()) {
            <div class="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 p-4">
              <p class="font-bold text-emerald-700 dark:text-emerald-400">Planning généré avec succès.</p>
              <p class="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-1">
                {{ planning.sessions().length }} session(s) générée(s).
              </p>
            </div>
          }
        </div>
      }

      <div class="flex justify-between">
        <button type="button" (click)="prevStep()" [disabled]="step() === 1"
                class="px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 disabled:opacity-40">
          Précédent
        </button>
        <button type="button" (click)="nextStep()"
                [disabled]="!canGoNext()"
                class="px-4 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white disabled:opacity-40">
          Suivant
        </button>
      </div>
    </div>
  `,
})
export class OnboardingPageComponent {
  auth = inject(AuthService);
  planning = inject(PlanningService);
  toast = inject(ToastService);
  router = inject(Router);

  step = signal(1);
  generated = signal(false);
  restDay = signal<number>(0);
  days = DAYS;

  slots = signal<Array<Availability & { key: string }>>([]);

  courseForm = {
    name: '',
    priority: 'Moyenne' as Priority,
    weeklyGoalHours: 5,
    workMode: 'private' as 'private' | 'group',
  };
  projectForm = {
    name: '',
    priority: 'Moyenne' as Priority,
    weeklyGoalHours: 4,
    workMode: 'private' as 'private' | 'group',
  };

  canGoNext = computed(() => {
    if (this.step() === 1) return this.slots().length > 0;
    if (this.step() === 2) return this.planning.subjects().length > 0;
    return this.generated();
  });

  slotsForDay(dow: number) {
    return this.slots().filter((s) => s.dayOfWeek === dow);
  }

  addAvailability(dow: number): void {
    const key = `k-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.slots.update((x) => [...x, { key, dayOfWeek: dow, startTime: '18:00', endTime: '20:00' }]);
  }

  removeSlot(key: string): void {
    this.slots.update((x) => x.filter((s) => s.key !== key));
  }

  addCourse(): void {
    const f = this.courseForm;
    if (!f.name.trim()) return;
    this.planning.addSubjectHttp({
      name: f.name.trim(),
      color: '#6366f1',
      priority: f.priority,
      weeklyGoalHours: Number(f.weeklyGoalHours),
      studyType: 'course',
      workMode: f.workMode,
      minSessionMin: 45,
      maxSessionMin: 120,
    });
    this.courseForm = { name: '', priority: 'Moyenne', weeklyGoalHours: 5, workMode: 'private' };
  }

  addProject(): void {
    const f = this.projectForm;
    if (!f.name.trim()) return;
    this.planning.addSubjectHttp({
      name: f.name.trim(),
      color: '#f59e0b',
      priority: f.priority,
      weeklyGoalHours: Number(f.weeklyGoalHours),
      studyType: 'project',
      workMode: f.workMode,
      minSessionMin: 45,
      maxSessionMin: 120,
    });
    this.projectForm = { name: '', priority: 'Moyenne', weeklyGoalHours: 4, workMode: 'private' };
  }

  prevStep(): void {
    this.step.update((s) => Math.max(1, s - 1));
  }

  nextStep(): void {
    if (!this.canGoNext()) return;
    if (this.step() === 1) {
      const payload = this.slots().map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime }));
      this.planning.setAvailabilitiesHttp(payload);
      this.auth.updateProfileHttp({
        preferences: { restDayIndices: [this.restDay()] },
      }).subscribe();
    }
    this.step.update((s) => Math.min(3, s + 1));
  }

  generate(): void {
    this.planning.generateScheduleHttp([this.restDay()]).subscribe({
      next: (shortfall) => {
        this.planning.confirmDraftSchedule();
        this.generated.set(true);
        if (shortfall.length) {
          this.toast.show('Planning généré avec ajustements : certaines heures n’ont pas pu être placées.', 'warning');
        } else {
          this.toast.show('Planning généré.');
        }
      },
      error: () => {
        const shortfall = this.planning.generateSchedule([this.restDay()]);
        this.planning.confirmDraftSchedule();
        this.generated.set(true);
        if (shortfall.length) {
          this.toast.show('Planning généré avec ajustements : certaines heures n’ont pas pu être placées.', 'warning');
        } else {
          this.toast.show('Planning généré.');
        }
      },
    });
  }

  finish(): void {
    if (!this.generated()) return;
    this.auth.completeOnboardingHttp().subscribe({
      next: () => {
        this.toast.show('Configuration terminée. Bienvenue !', 'success');
        void this.router.navigate(['/app/dashboard']);
      },
      error: () => {
        this.toast.show("Impossible d'enregistrer la fin d'onboarding. Vérifiez la connexion puis réessayez.", 'error');
      },
    });
  }
}


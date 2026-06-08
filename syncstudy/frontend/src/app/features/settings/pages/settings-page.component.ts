import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ThemeService } from '../../../core/services/theme.service';

/** 0 = dimanche … 6 = samedi (getDay) */
const WEEK_DAYS: { dow: number; label: string }[] = [
  { dow: 0, label: 'Dim' },
  { dow: 1, label: 'Lun' },
  { dow: 2, label: 'Mar' },
  { dow: 3, label: 'Mer' },
  { dow: 4, label: 'Jeu' },
  { dow: 5, label: 'Ven' },
  { dow: 6, label: 'Sam' },
];

const SESSION_LENGTH_OPTIONS = [30, 45, 60, 90, 120];

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-8 fade-in">
      <div>
        <h1 class="text-3xl font-black text-slate-900 dark:text-white">Paramètres</h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">Gérez votre profil et vos préférences d'étude.</p>
      </div>

      <div class="max-w-3xl space-y-6">
        <div class="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-6">Profil Utilisateur</h3>

          <div class="flex items-center gap-6 mb-8">
            <img [src]="avatarUrl()"
                 class="w-20 h-20 rounded-3xl bg-indigo-100 dark:bg-indigo-900 border border-slate-200 dark:border-slate-700"
                 alt="Avatar" />
            <div>
              <button (click)="changeAvatar()"
                      class="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all mb-2 block">
                Changer l'avatar
              </button>
              <p class="text-xs text-slate-400 dark:text-slate-500 font-medium">Format JPG, PNG ou SVG. Max 2MB.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div class="space-y-2">
              <label class="text-sm font-bold text-slate-700 dark:text-slate-300">Nom complet</label>
              <input [(ngModel)]="form.name" type="text"
                     class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm
                            text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-bold text-slate-700 dark:text-slate-300">Email</label>
              <input [(ngModel)]="form.email" type="email"
                     class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm
                            text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-bold text-slate-700 dark:text-slate-300">École / Université</label>
              <input [(ngModel)]="form.school" type="text"
                     class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm
                            text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-bold text-slate-700 dark:text-slate-300">Niveau d'étude</label>
              <select [(ngModel)]="form.level"
                      class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm
                             text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all appearance-none">
                <option>Cycle Ingénieur - 1ère année</option>
                <option>Cycle Ingénieur - 2ème année</option>
                <option>Cycle Ingénieur - 3ème année</option>
                <option>Master 1</option>
                <option>Master 2</option>
                <option>Doctorat</option>
              </select>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">Préférences d'étude</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Aligné CDC §4.1.1 (durée de session préférée, jours de repos).</p>

          <div class="space-y-6">
            <div>
              <label class="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">Durée de session préférée</label>
              <p class="text-xs text-slate-500 dark:text-slate-400 mb-3">Utilisée comme référence pour la planification (intégration API ultérieure).</p>
              <select name="prefMin" [ngModel]="prefSessionMinutes()" (ngModelChange)="prefSessionMinutes.set(+$event)"
                      class="w-full max-w-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold
                             text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-400 outline-none">
                @for (m of sessionLengthOptions; track m) {
                  <option [ngValue]="m">{{ m }} minutes</option>
                }
              </select>
            </div>

            <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <p class="font-bold text-slate-900 dark:text-white">Mode sombre</p>
                <p class="text-sm text-slate-500 dark:text-slate-400">Interface sombre.</p>
              </div>
              <button type="button" (click)="toggleDarkMode()"
                      [class]="'w-12 h-6 rounded-full relative transition-all duration-300 '
                              + (themeService.isDark$() ? 'bg-indigo-600' : 'bg-slate-200')">
                <div [class]="'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 '
                             + (themeService.isDark$() ? 'right-1' : 'left-1')"></div>
              </button>
            </div>

            <div class="flex items-center justify-between">
              <div>
                <p class="font-bold text-slate-900 dark:text-white">Notifications push (rappels)</p>
                <p class="text-sm text-slate-500 dark:text-slate-400">Rappels avant les sessions.</p>
              </div>
              <button type="button" (click)="pushNotif.set(!pushNotif())"
                      [class]="'w-12 h-6 rounded-full relative transition-all duration-300 '
                              + (pushNotif() ? 'bg-indigo-600' : 'bg-slate-200')">
                <div [class]="'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 '
                             + (pushNotif() ? 'right-1' : 'left-1')"></div>
              </button>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-4">
          <button type="button" (click)="resetForm()"
                  class="px-8 py-3 rounded-2xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            Annuler
          </button>
          <button type="button" (click)="save()"
                  class="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
            Enregistrer les modifications
          </button>
        </div>
      </div>
    </div>
  `,
})
export class SettingsPageComponent implements OnInit {
  auth = inject(AuthService);
  toast = inject(ToastService);
  themeService = inject(ThemeService);

  pushNotif = signal(false);
  avatarSeed = signal('Hiba');
  prefSessionMinutes = signal(45);
  restDayIndices = signal<number[]>([]);

  form = {
    name: '',
    email: '',
    school: '',
    level: 'Cycle Ingénieur - 1ère année',
  };

  readonly weekDays = WEEK_DAYS;
  readonly sessionLengthOptions = SESSION_LENGTH_OPTIONS;

  ngOnInit(): void {
    this.resetForm();
  }

  avatarUrl(): string {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${this.avatarSeed()}`;
  }

  changeAvatar(): void {
    const seeds = ['Hiba', 'Sarah', 'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey'];
    const cur = seeds.indexOf(this.avatarSeed());
    this.avatarSeed.set(seeds[(cur + 1) % seeds.length]);
    this.auth.updateAvatar(this.avatarSeed());
    this.toast.show('Avatar mis à jour !');
  }

  isRestDay(dow: number): boolean {
    return this.restDayIndices().includes(dow);
  }

  toggleRestDay(dow: number): void {
    this.restDayIndices.update((list) =>
      list.includes(dow) ? list.filter((x) => x !== dow) : [...list, dow].sort((a, b) => a - b)
    );
  }

  save(): void {
    this.auth.updateProfileHttp({
      name: this.form.name,
      email: this.form.email,
      school: this.form.school,
      level: this.form.level,
      preferences: {
        preferredSessionMinutes: this.prefSessionMinutes(),
        restDayIndices: this.restDayIndices(),
        pushNotifications: this.pushNotif(),
      },
    }).subscribe({
      next: () => this.toast.show('Modifications enregistrées !'),
      error: () => this.toast.show("Échec d'enregistrement des paramètres.", 'error'),
    });
  }

  resetForm(): void {
    const u = this.auth.currentUser();
    if (u) {
      this.form = {
        name: u.name,
        email: u.email,
        school: u.school ?? '',
        level: u.level ?? 'Cycle Ingénieur - 1ère année',
      };
      this.prefSessionMinutes.set(u.preferences?.preferredSessionMinutes ?? 45);
      this.restDayIndices.set([...(u.preferences?.restDayIndices ?? [])]);
      // Lire la préférence push depuis le profil (défaut : true)
      this.pushNotif.set(u.preferences?.pushNotifications ?? true);
    }
  }

  toggleDarkMode(): void {
    this.themeService.toggle();
  }
}

import { Component, output, signal, computed } from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-demo-modal',
  standalone: true,
  imports: [CommonModule, NgTemplateOutlet],
  template: `
    <!-- Overlay -->
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4"
         (click)="onOverlayClick($event)">
      <div class="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"></div>

      <!-- Card -->
      <div class="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden
                  flex flex-col" style="max-height:90vh">

        <!-- Header -->
        <div class="flex items-center justify-between px-8 pt-7 pb-4 flex-shrink-0">
          <div>
            <div class="flex gap-1.5 mb-3">
              @for (s of slides; track s.id; let i = $index) {
                <button (click)="goTo(i)"
                        [class]="'h-1.5 rounded-full transition-all duration-300 '
                                + (i === current() ? 'w-8 bg-indigo-600' : 'w-4 bg-slate-200')">
                </button>
              }
            </div>
            <p class="text-xs font-bold text-indigo-500 uppercase tracking-widest">
              {{ current() + 1 }} / {{ slides.length }} — {{ currentSlide().tag }}
            </p>
          </div>
          <button (click)="close.emit()"
                  class="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center
                         justify-center transition-colors">
            <span class="material-icons text-slate-500 text-lg">close</span>
          </button>
        </div>

        <!-- Slide content -->
        <div class="flex-1 overflow-y-auto px-8 pb-4">
          <div class="grid md:grid-cols-2 gap-8 items-center min-h-[340px]">
            <!-- Texte -->
            <div>
              <div [class]="'w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ' + currentSlide().iconBg">
                <span [class]="'material-icons text-2xl ' + currentSlide().iconColor">
                  {{ currentSlide().icon }}
                </span>
              </div>
              <h2 class="text-2xl font-black text-slate-900 mb-4 leading-tight">
                {{ currentSlide().title }}
              </h2>
              <p class="text-slate-500 text-sm leading-relaxed mb-6">
                {{ currentSlide().description }}
              </p>
              <ul class="space-y-2">
                @for (point of currentSlide().points; track point) {
                  <li class="flex items-center gap-2 text-sm text-slate-700">
                    <span class="material-icons text-emerald-500 text-base">check_circle</span>
                    {{ point }}
                  </li>
                }
              </ul>
            </div>

            <!-- Mockup -->
            <div [class]="'rounded-2xl p-4 ' + currentSlide().mockupBg">
              @switch (current()) {
                @case (0) { <ng-container *ngTemplateOutlet="mockupPlanning"></ng-container> }
                @case (1) { <ng-container *ngTemplateOutlet="mockupSubjects"></ng-container> }
                @case (2) { <ng-container *ngTemplateOutlet="mockupGroups"></ng-container> }
                @case (3) { <ng-container *ngTemplateOutlet="mockupStats"></ng-container> }
                @case (4) { <ng-container *ngTemplateOutlet="mockupCta"></ng-container> }
              }
            </div>
          </div>
        </div>

        <!-- Footer navigation -->
        <div class="flex items-center justify-between px-8 py-5 border-t border-slate-100 flex-shrink-0 bg-white">
          <button (click)="prev()" [disabled]="current() === 0"
                  class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
                         text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-30
                         disabled:cursor-not-allowed">
            <span class="material-icons text-base">arrow_back</span>
            Précédent
          </button>

          @if (current() < slides.length - 1) {
            <button (click)="next()"
                    class="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5
                           rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all
                           shadow-lg shadow-indigo-100">
              Suivant
              <span class="material-icons text-base">arrow_forward</span>
            </button>
          } @else {
            <button (click)="startNow.emit()"
                    class="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5
                           rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all
                           shadow-lg shadow-indigo-100">
              <span class="material-icons text-base">rocket_launch</span>
              Commencer gratuitement
            </button>
          }
        </div>
      </div>
    </div>

    <!-- ── MOCKUPS ── -->

    <!-- Slide 0 : Planning -->
    <ng-template #mockupPlanning>
      <div class="space-y-2">
        <div class="bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Lundi — Planning généré
        </div>
        @for (s of planSessions; track s.subject) {
          <div class="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm">
            <div class="w-1 h-10 rounded-full flex-shrink-0" [style.background]="s.color"></div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-bold text-slate-800 truncate">{{ s.subject }}</p>
              <p class="text-[10px] text-slate-400">{{ s.time }}</p>
            </div>
            <span [class]="'material-icons text-base ' + (s.done ? 'text-emerald-500' : 'text-slate-200')">
              check_circle
            </span>
          </div>
        }
      </div>
    </ng-template>

    <!-- Slide 1 : Matières -->
    <ng-template #mockupSubjects>
      <div class="space-y-3">
        @for (s of subjectsMock; track s.name) {
          <div class="bg-white rounded-xl p-3 shadow-sm">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full" [style.background]="s.color"></div>
                <span class="text-xs font-bold text-slate-800">{{ s.name }}</span>
              </div>
              <span class="text-[10px] text-slate-400">{{ s.hours }}h / {{ s.total }}h</span>
            </div>
            <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all" [style.width]="s.pct+'%'"
                   [style.background]="s.color"></div>
            </div>
          </div>
        }
      </div>
    </ng-template>

    <!-- Slide 2 : Groupes -->
    <ng-template #mockupGroups>
      <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div class="bg-indigo-600 px-4 py-3 flex items-center gap-3">
          <span class="material-icons text-white text-lg">groups</span>
          <span class="text-white font-bold text-sm">Groupe — Algo & DS</span>
          <span class="ml-auto text-xs text-indigo-200">4 membres</span>
        </div>
        <div class="p-3 space-y-2">
          @for (m of groupMembers; track m.name) {
            <div class="flex items-center gap-3">
              <div class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black"
                   [style.background]="m.bg" [style.color]="m.fg">{{ m.init }}</div>
              <span class="text-xs font-medium text-slate-700">{{ m.name }}</span>
              <span [class]="'ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full '
                           + (m.online ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400')">
                {{ m.online ? 'En ligne' : 'Hors ligne' }}
              </span>
            </div>
          }
          <div class="mt-3 bg-indigo-50 rounded-xl p-3 flex items-center gap-2">
            <span class="material-icons text-indigo-500 text-sm">event</span>
            <div>
              <p class="text-[10px] font-bold text-indigo-700">Session partagée</p>
              <p class="text-[10px] text-indigo-500">Aujourd'hui 20h — Complexité & Big-O</p>
            </div>
          </div>
        </div>
      </div>
    </ng-template>

    <!-- Slide 3 : Stats -->
    <ng-template #mockupStats>
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-2">
          @for (kpi of kpis; track kpi.label) {
            <div class="bg-white rounded-xl p-3 shadow-sm">
              <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{{ kpi.label }}</p>
              <p class="text-xl font-black" [style.color]="kpi.color">{{ kpi.value }}</p>
            </div>
          }
        </div>
        <!-- Mini bar chart -->
        <div class="bg-white rounded-xl p-3 shadow-sm">
          <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-3">Heures / jour</p>
          <div class="flex items-end gap-1.5 h-16">
            @for (b of bars; track b.day) {
              <div class="flex-1 flex flex-col items-center gap-1">
                <div class="w-full rounded-sm bg-indigo-500 transition-all"
                     [style.height.px]="b.h" [style.opacity]="b.active ? 1 : 0.35"></div>
                <span class="text-[8px] text-slate-400">{{ b.day }}</span>
              </div>
            }
          </div>
        </div>
      </div>
    </ng-template>

    <!-- Slide 4 : CTA -->
    <ng-template #mockupCta>
      <div class="flex flex-col items-center justify-center h-full py-6 text-center">
        <div class="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mb-5 shadow-xl shadow-indigo-200">
          <span class="material-icons text-white text-4xl">school</span>
        </div>
        <p class="text-lg font-black text-slate-900 mb-2">SyncStudy</p>
        <p class="text-xs text-slate-500 mb-5 leading-relaxed">
          Votre planning intelligent,<br>disponible partout, tout le temps.
        </p>
        <div class="flex flex-col gap-2 w-full">
          @for (badge of ctaBadges; track badge.label) {
            <div class="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-2.5 text-left">
              <span [class]="'material-icons text-base ' + badge.color">{{ badge.icon }}</span>
              <span class="text-xs font-semibold text-slate-700">{{ badge.label }}</span>
            </div>
          }
        </div>
      </div>
    </ng-template>
  `,
})
export class DemoModalComponent {
  close    = output<void>();
  startNow = output<void>();

  current = signal(0);
  currentSlide = computed(() => this.slides[this.current()]);

  next() { if (this.current() < this.slides.length - 1) this.current.update(v => v + 1); }
  prev() { if (this.current() > 0) this.current.update(v => v - 1); }
  goTo(i: number) { this.current.set(i); }

  onOverlayClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('fixed')) this.close.emit();
  }

  slides = [
    {
      id: 0,
      tag: 'Planning',
      icon: 'auto_awesome',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      mockupBg: 'bg-indigo-50',
      title: 'Planning généré en quelques secondes',
      description: 'Renseignez vos matières et vos disponibilités. Notre algorithme crée automatiquement un emploi du temps optimal et équilibré, sans conflits.',
      points: ['Priorisation intelligente des matières', 'Respect de vos créneaux libres', 'Ajustement en temps réel'],
    },
    {
      id: 1,
      tag: 'Matières',
      icon: 'menu_book',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      mockupBg: 'bg-emerald-50',
      title: 'Gérez toutes vos matières en un seul endroit',
      description: 'Ajoutez vos matières, définissez le nombre d\'heures cibles et suivez votre progression heure par heure pour chaque module.',
      points: ['Suivi des heures planifiées vs réalisées', 'Indicateurs de progression visuels', 'Alertes en cas de retard'],
    },
    {
      id: 2,
      tag: 'Collaboration',
      icon: 'groups',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      mockupBg: 'bg-violet-50',
      title: 'Étudiez ensemble, progressez plus vite',
      description: 'Créez ou rejoignez des groupes de travail avec vos camarades. Synchronisez vos plannings et partagez des sessions d\'étude en commun.',
      points: ['Groupes privés avec code d\'invitation', 'Sessions partagées synchronisées', 'Messagerie de groupe intégrée'],
    },
    {
      id: 3,
      tag: 'Statistiques',
      icon: 'bar_chart',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      mockupBg: 'bg-amber-50',
      title: 'Analysez et améliorez votre productivité',
      description: 'Visualisez vos heures d\'étude par jour, par matière et par semaine. Identifiez vos points forts et les axes d\'amélioration.',
      points: ['Tableau de bord avec indicateurs clés', 'Graphiques hebdomadaires et mensuels', 'Taux de complétion des sessions'],
    },
    {
      id: 4,
      tag: 'Démarrer',
      icon: 'rocket_launch',
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-600',
      mockupBg: 'bg-slate-50',
      title: 'Prêt à transformer votre façon d\'étudier ?',
      description: 'SyncStudy est 100% gratuit, sans publicité. Créez votre compte en 30 secondes et générez votre premier planning immédiatement.',
      points: ['Inscription gratuite et instantanée', 'Planning prêt en moins d\'une minute', 'Disponible sur tous vos appareils'],
    },
  ];

  planSessions = [
    { subject: 'Java & Spring Boot',    time: '08:00 – 10:00', color: '#6366f1', done: true  },
    { subject: 'Bases de Données',      time: '10:30 – 12:00', color: '#10b981', done: true  },
    { subject: 'Réseaux Informatiques', time: '14:00 – 16:00', color: '#ec4899', done: false },
    { subject: 'Gestion de Projet',     time: '16:30 – 18:00', color: '#f59e0b', done: false },
  ];

  subjectsMock = [
    { name: 'Java & Spring Boot',    color: '#6366f1', hours: 12, total: 20, pct: 60 },
    { name: 'Bases de Données',      color: '#10b981', hours: 8,  total: 15, pct: 53 },
    { name: 'Réseaux Informatiques', color: '#ec4899', hours: 5,  total: 12, pct: 42 },
    { name: 'Algorithmique',         color: '#f59e0b', hours: 9,  total: 18, pct: 50 },
  ];

  groupMembers = [
    { name: 'Hiba Ouachcham',  init: 'HO', bg: '#eef2ff', fg: '#4f46e5', online: true  },
    { name: 'Aicha Amrouch',   init: 'AA', bg: '#f0fdf4', fg: '#16a34a', online: true  },
    { name: 'Salma Loukilia',  init: 'SL', bg: '#fdf4ff', fg: '#9333ea', online: false },
    { name: 'Yassine Ladraoui',init: 'YL', bg: '#fff7ed', fg: '#ea580c', online: false },
  ];

  kpis = [
    { label: 'Heures cette semaine', value: '18h',  color: '#6366f1' },
    { label: 'Sessions complétées',  value: '12',   color: '#10b981' },
    { label: 'Taux de complétion',   value: '84%',  color: '#f59e0b' },
    { label: 'Matières actives',     value: '4',    color: '#ec4899' },
  ];

  bars = [
    { day: 'L', h: 40, active: false },
    { day: 'M', h: 55, active: false },
    { day: 'M', h: 30, active: false },
    { day: 'J', h: 48, active: false },
    { day: 'V', h: 62, active: true  },
    { day: 'S', h: 20, active: false },
    { day: 'D', h: 10, active: false },
  ];

  ctaBadges = [
    { icon: 'check_circle', color: 'text-emerald-500', label: '100% gratuit — aucune carte requise'  },
    { icon: 'bolt',         color: 'text-amber-500',   label: 'Planning généré en moins d\'1 minute' },
    { icon: 'lock',         color: 'text-indigo-500',  label: 'Vos données protégées et sécurisées'  },
  ];
}

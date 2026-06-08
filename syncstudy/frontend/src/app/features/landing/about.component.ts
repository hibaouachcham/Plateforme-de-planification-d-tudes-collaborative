import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- ═══════════════ NAVBAR ═══════════════ -->
    <nav class="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md shadow-sm px-6 py-4">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <a routerLink="/" class="flex items-center gap-2">
          <div class="bg-indigo-600 p-2 rounded-xl">
            <span class="material-icons text-white">school</span>
          </div>
          <span class="text-2xl font-black text-slate-900">SyncStudy</span>
        </a>
        <div class="flex items-center gap-4">
          <a routerLink="/" class="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Accueil</a>
          <a routerLink="/contact"
             class="bg-indigo-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold
                    hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
            Nous contacter
          </a>
        </div>
      </div>
    </nav>

    <div class="pt-20">

      <!-- ═══════════════ HERO ═══════════════ -->
      <section class="relative py-24 overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-blue-50">
        <div class="absolute top-[-10%] right-[-5%] w-[35%] h-[60%] bg-indigo-100 rounded-full blur-3xl opacity-40 pointer-events-none"></div>
        <div class="absolute bottom-[-10%] left-[-5%] w-[30%] h-[50%] bg-blue-100 rounded-full blur-3xl opacity-40 pointer-events-none"></div>

        <div class="max-w-4xl mx-auto px-6 text-center relative z-10">
          <span class="inline-block px-4 py-1.5 mb-6 text-sm font-semibold tracking-wide
                       text-indigo-600 uppercase bg-indigo-50 border border-indigo-100 rounded-full">
            À propos de SyncStudy
          </span>
          <h1 class="text-5xl lg:text-6xl font-black text-slate-900 leading-tight mb-6">
            Créée par des étudiants,<br />
            <span class="text-indigo-600">pour des étudiants.</span>
          </h1>
          <p class="text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
            SyncStudy est née d'un constat simple : les étudiants ingénieurs manquent d'outils adaptés
            à la gestion intelligente de leur temps. Nous avons décidé de construire la solution.
          </p>
        </div>
      </section>

      <!-- ═══════════════ STATS ═══════════════ -->
      <section class="py-16 bg-white border-y border-slate-100">
        <div class="max-w-5xl mx-auto px-6">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
            @for (stat of stats; track stat.label) {
              <div class="text-center">
                <div class="text-4xl font-black text-indigo-600 mb-1">{{ stat.value }}</div>
                <div class="text-sm text-slate-500 font-medium">{{ stat.label }}</div>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- ═══════════════ MISSION ═══════════════ -->
      <section class="py-24 bg-white">
        <div class="max-w-6xl mx-auto px-6">
          <div class="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span class="text-xs font-bold text-indigo-500 uppercase tracking-widest">Notre mission</span>
              <h2 class="text-4xl font-black text-slate-900 mt-3 mb-6 leading-tight">
                Rendre l'organisation académique accessible à tous
              </h2>
              <p class="text-slate-600 leading-relaxed mb-6">
                Trop d'étudiants brillants échouent non pas par manque de capacités, mais par manque
                d'organisation. SyncStudy automatise la planification pour que chaque étudiant puisse
                se concentrer sur l'essentiel : apprendre.
              </p>
              <p class="text-slate-600 leading-relaxed">
                Notre algorithme intelligent prend en compte vos disponibilités, vos matières,
                vos groupes de travail et vos objectifs pour générer un planning personnalisé,
                adaptatif et réaliste.
              </p>
            </div>
            <div class="grid grid-cols-2 gap-4">
              @for (value of values; track value.title) {
                <div class="bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:border-indigo-200
                            hover:bg-indigo-50/30 transition-all">
                  <div class="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                    <span class="material-icons text-indigo-600 text-xl">{{ value.icon }}</span>
                  </div>
                  <h3 class="font-bold text-slate-900 mb-1">{{ value.title }}</h3>
                  <p class="text-xs text-slate-500 leading-relaxed">{{ value.desc }}</p>
                </div>
              }
            </div>
          </div>
        </div>
      </section>

      <!-- ═══════════════ COMMENT ÇA MARCHE ═══════════════ -->
      <section class="py-24 bg-slate-50">
        <div class="max-w-5xl mx-auto px-6">
          <div class="text-center mb-16">
            <span class="text-xs font-bold text-indigo-500 uppercase tracking-widest">Comment ça marche</span>
            <h2 class="text-4xl font-black text-slate-900 mt-3">Trois étapes vers l'excellence</h2>
          </div>
          <div class="grid md:grid-cols-3 gap-8">
            @for (step of steps; track step.num) {
              <div class="relative bg-white rounded-3xl p-8 shadow-sm border border-slate-100
                          hover:shadow-md hover:border-indigo-100 transition-all">
                <div class="absolute -top-4 left-8 w-8 h-8 bg-indigo-600 rounded-full flex items-center
                             justify-center text-white font-black text-sm shadow-lg shadow-indigo-200">
                  {{ step.num }}
                </div>
                <div class="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-5 mt-2">
                  <span class="material-icons text-indigo-600">{{ step.icon }}</span>
                </div>
                <h3 class="text-lg font-black text-slate-900 mb-3">{{ step.title }}</h3>
                <p class="text-sm text-slate-500 leading-relaxed">{{ step.desc }}</p>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- ═══════════════ ÉQUIPE ═══════════════ -->
      <section class="py-24 bg-white">
        <div class="max-w-5xl mx-auto px-6">
          <div class="text-center mb-16">
            <span class="text-xs font-bold text-indigo-500 uppercase tracking-widest">L'équipe</span>
            <h2 class="text-4xl font-black text-slate-900 mt-3 mb-4">Les fondatrices</h2>
            <p class="text-slate-500 max-w-xl mx-auto">
              Trois étudiantes ingénieures passionnées par la tech et l'innovation éducative,
              unies par la vision de transformer l'expérience académique.
            </p>
          </div>
          <div class="grid md:grid-cols-3 gap-8">
            @for (member of team; track member.name) {
              <div class="group text-center bg-slate-50 rounded-3xl p-8 border border-slate-100
                          hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 transition-all">
                <!-- Avatar -->
                <div class="relative mx-auto mb-6 w-24 h-24">
                  <div [style.background]="member.bg"
                       class="w-24 h-24 rounded-full flex items-center justify-center shadow-lg
                              group-hover:scale-105 transition-transform">
                    <span class="text-3xl font-black" [style.color]="member.fg">{{ member.initials }}</span>
                  </div>
                  <div class="absolute bottom-0 right-0 w-7 h-7 bg-emerald-400 rounded-full
                              border-2 border-white flex items-center justify-center">
                    <span class="material-icons text-white text-xs">check</span>
                  </div>
                </div>
                <h3 class="text-lg font-black text-slate-900 mb-1">{{ member.name }}</h3>
                <p class="text-sm font-semibold text-indigo-600 mb-3">{{ member.role }}</p>
                <p class="text-xs text-slate-500 leading-relaxed">{{ member.bio }}</p>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- ═══════════════ CTA ═══════════════ -->
      <section class="py-20 bg-indigo-600">
        <div class="max-w-3xl mx-auto px-6 text-center">
          <h2 class="text-4xl font-black text-white mb-4">Prêt à transformer votre façon d'étudier ?</h2>
          <p class="text-indigo-200 mb-10 text-lg">
            Rejoignez des milliers d'étudiants qui ont déjà optimisé leur temps avec SyncStudy.
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a routerLink="/"
               class="bg-white text-indigo-700 px-8 py-4 rounded-2xl font-bold text-lg
                      hover:bg-indigo-50 transition-all shadow-xl">
              Commencer gratuitement
            </a>
            <a routerLink="/contact"
               class="border-2 border-white/40 text-white px-8 py-4 rounded-2xl font-bold text-lg
                      hover:bg-white/10 transition-all">
              Nous contacter
            </a>
          </div>
        </div>
      </section>

      <!-- ═══════════════ FOOTER MINIMAL ═══════════════ -->
      <footer class="bg-slate-900 text-slate-400 py-8 px-6 text-center text-sm">
        © 2026 SyncStudy. Tous droits réservés.
        <span class="mx-3 text-slate-600">·</span>
        <a routerLink="/about"   class="hover:text-white transition-colors">À propos</a>
        <span class="mx-3 text-slate-600">·</span>
        <a routerLink="/contact" class="hover:text-white transition-colors">Contact</a>
      </footer>
    </div>
  `,
})
export class AboutComponent {
  stats = [
    { value: '500+',  label: 'Étudiants inscrits'    },
    { value: '12 000+', label: 'Heures planifiées'   },
    { value: '98%',   label: 'Taux de satisfaction'  },
    { value: '50+',   label: 'Établissements'        },
  ];

  values = [
    { icon: 'bolt',         title: 'Performance',    desc: 'Des algorithmes optimisés pour maximiser votre productivité.' },
    { icon: 'group',        title: 'Collaboration',  desc: 'Travaillez en groupe de façon fluide et synchronisée.' },
    { icon: 'accessibility',title: 'Accessibilité',  desc: 'Gratuit, simple et conçu pour tous les profils.' },
    { icon: 'insights',     title: 'Analytique',     desc: 'Suivez vos progrès avec des statistiques précises.' },
  ];

  steps = [
    {
      num: '1', icon: 'person_add', title: 'Créez votre profil',
      desc: 'Renseignez vos matières, vos disponibilités hebdomadaires et vos objectifs d\'étude personnels.',
    },
    {
      num: '2', icon: 'auto_awesome', title: 'L\'algorithme planifie',
      desc: 'Notre moteur intelligent génère un planning adaptatif équilibré en quelques secondes.',
    },
    {
      num: '3', icon: 'trending_up', title: 'Progressez ensemble',
      desc: 'Rejoignez des groupes, partagez des sessions et suivez votre progression en temps réel.',
    },
  ];

  team = [
    {
      name: 'Ouachcham Hiba',
      initials: 'OH',
      role: 'Co-fondatrice & Développeuse',
      bio: 'Spécialisée en développement full-stack, Hiba a conçu l\'architecture frontend de SyncStudy avec une attention particulière à l\'expérience utilisateur.',
      bg: '#eef2ff',
      fg: '#4f46e5',
    },
    {
      name: 'Amrouch Aicha',
      initials: 'AA',
      role: 'Co-fondatrice & Développeuse',
      bio: 'Passionnée par les systèmes backend et les bases de données, Aicha a bâti l\'infrastructure robuste qui propulse SyncStudy.',
      bg: '#f0fdf4',
      fg: '#16a34a',
    },
    {
      name: 'Loukilia Salma',
      initials: 'LS',
      role: 'Co-fondatrice & Développeuse',
      bio: 'Experte en algorithmes et en intelligence artificielle, Salma est à l\'origine du moteur de planification intelligent de SyncStudy.',
      bg: '#fdf4ff',
      fg: '#9333ea',
    },
  ];
}

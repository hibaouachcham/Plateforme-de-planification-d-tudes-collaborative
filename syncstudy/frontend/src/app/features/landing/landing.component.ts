import { Component, signal, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthDialogComponent } from '../auth/components/auth-dialog/auth-dialog.component';
import { DemoModalComponent } from './demo-modal.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, DemoModalComponent],
  template: `
    <!-- ═══════════════ NAVBAR ═══════════════ -->
    <nav [class]="'fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4 '
                + (scrolled() ? 'bg-white/90 backdrop-blur-md shadow-sm' : 'bg-transparent')">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="bg-indigo-600 p-2 rounded-xl">
            <span class="material-icons text-white">school</span>
          </div>
          <span class="text-2xl font-black text-slate-900">SyncStudy</span>
        </div>

        <div class="hidden md:flex items-center gap-8">
          <a href="#features"      class="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Fonctionnalités</a>
          <a href="#algorithm"     class="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">L'Algorithme</a>
          <a href="#collaborative" class="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Collaboration</a>
          <button (click)="openAuth('login')"
                  class="text-sm font-semibold text-indigo-600 hover:text-indigo-700">Connexion</button>
          <button (click)="openAuth('signup')"
                  class="bg-indigo-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold
                         hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
            Commencer gratuitement
          </button>
        </div>

        <button class="md:hidden text-slate-900" (click)="mobileOpen.set(!mobileOpen())">
          <span class="material-icons">{{ mobileOpen() ? 'close' : 'menu' }}</span>
        </button>
      </div>

      @if (mobileOpen()) {
        <div class="absolute top-full left-0 right-0 bg-white border-b border-slate-100 p-6 flex flex-col gap-4 shadow-xl fade-in">
          <a href="#features"      class="text-lg font-medium text-slate-900">Fonctionnalités</a>
          <a href="#algorithm"     class="text-lg font-medium text-slate-900">L'Algorithme</a>
          <a href="#collaborative" class="text-lg font-medium text-slate-900">Collaboration</a>
          <hr class="border-slate-100" />
          <button (click)="openAuth('login')"
                  class="text-lg font-semibold text-indigo-600 text-left">Connexion</button>
          <button (click)="openAuth('signup')"
                  class="bg-indigo-600 text-white px-5 py-3 rounded-xl text-lg font-semibold">
            Commencer gratuitement
          </button>
        </div>
      }
    </nav>

    <!-- ═══════════════ HERO ═══════════════ -->
    <section class="relative pt-32 pb-20 overflow-hidden">
      <div class="absolute inset-0 -z-10 pointer-events-none">
        <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-3xl opacity-60"></div>
        <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-3xl opacity-60"></div>
      </div>

      <div class="max-w-7xl mx-auto px-6">
        <div class="flex flex-col lg:flex-row items-center gap-16">
          <!-- Text -->
          <div class="flex-1 text-center lg:text-left fade-in">
            <span class="inline-block px-4 py-1.5 mb-6 text-sm font-semibold tracking-wide
                         text-indigo-600 uppercase bg-indigo-50 rounded-full">
              L'Assistant d'Étude Intelligent
            </span>
            <h1 class="text-5xl lg:text-7xl font-black text-slate-900 leading-[1.1] mb-8">
              Optimisez votre temps,<br />
              <span class="text-indigo-600">Maîtrisez votre avenir.</span>
            </h1>
            <p class="text-xl text-slate-600 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              SyncStudy génère automatiquement votre planning d'études idéal.
              Gérez vos matières, collaborez en groupe et suivez vos progrès.
            </p>
            <div class="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button (click)="openAuth('signup')"
                      class="w-full sm:w-auto bg-indigo-600 text-white px-8 py-4 rounded-2xl text-lg
                             font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200
                             flex items-center justify-center gap-2 group">
                Générer mon planning
                <span class="material-icons group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
              <button (click)="showDemo.set(true)"
                      class="w-full sm:w-auto bg-white text-slate-900 border border-slate-200 px-8 py-4
                             rounded-2xl text-lg font-bold hover:bg-slate-50 transition-all
                             flex items-center justify-center gap-2">
                <span class="material-icons text-indigo-400">play_circle</span>
                Voir la démo
              </button>
            </div>

            <div class="mt-10 flex items-center justify-center lg:justify-start gap-8 text-slate-400">
              @for (badge of heroBadges; track badge) {
                <div class="flex items-center gap-2">
                  <span class="material-icons text-emerald-500 text-base">check_circle</span>
                  <span class="text-sm font-medium">{{ badge }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Dashboard mockup -->
          <div class="flex-1 relative">
            <div class="relative z-10 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
              <!-- Fake dashboard preview -->
              <div class="bg-slate-900 px-6 py-4 flex items-center gap-3">
                <div class="w-3 h-3 bg-red-400 rounded-full"></div>
                <div class="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <div class="w-3 h-3 bg-green-400 rounded-full"></div>
                <span class="text-slate-400 text-xs ml-4">SyncStudy — Tableau de bord</span>
              </div>
              <div class="p-6 space-y-4">
                <div class="flex gap-4">
                  <div class="flex-1 bg-indigo-50 p-4 rounded-2xl">
                    <p class="text-xs text-indigo-400 font-bold uppercase tracking-wider mb-1">Objectif semaine</p>
                    <p class="text-2xl font-black text-indigo-700">28h</p>
                  </div>
                  <div class="flex-1 bg-emerald-50 p-4 rounded-2xl">
                    <p class="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-1">Complétées</p>
                    <p class="text-2xl font-black text-emerald-700">18h</p>
                  </div>
                  <div class="flex-1 bg-amber-50 p-4 rounded-2xl">
                    <p class="text-xs text-amber-400 font-bold uppercase tracking-wider mb-1">Matières</p>
                    <p class="text-2xl font-black text-amber-700">4</p>
                  </div>
                </div>
                <div class="bg-slate-50 p-4 rounded-2xl space-y-3">
                  @for (s of previewSessions; track s.subject) {
                    <div class="flex items-center gap-3">
                      <div class="w-3 h-3 rounded-full" [style.background]="s.color"></div>
                      <span class="text-sm font-semibold text-slate-700 flex-1">{{ s.subject }}</span>
                      <span class="text-xs text-slate-400 font-medium">{{ s.time }}</span>
                      <span [class]="s.done ? 'text-emerald-500 material-icons text-sm' : 'text-slate-300 material-icons text-sm'">
                        {{ s.done ? 'check_circle' : 'radio_button_unchecked' }}
                      </span>
                    </div>
                  }
                </div>
              </div>
            </div>
            <div class="absolute -top-10 -right-10 w-32 h-32 bg-indigo-100 rounded-full blur-2xl -z-10"></div>
            <div class="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-100 rounded-full blur-3xl -z-10"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════ FEATURES ═══════════════ -->
    <section id="features" class="py-24 bg-slate-50">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-4xl font-black text-slate-900 mb-4">
            Conçu pour l'Excellence Académique
          </h2>
          <p class="text-lg text-slate-600 max-w-2xl mx-auto">
            SyncStudy regroupe tous les outils nécessaires pour transformer votre cursus.
          </p>
        </div>
        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          @for (f of features; track f.title) {
            <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-100
                        hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-default">
              <div [class]="'w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ' + f.bg">
                <span [class]="'material-icons text-2xl ' + f.iconColor">{{ f.icon }}</span>
              </div>
              <h3 class="text-xl font-bold text-slate-900 mb-3">{{ f.title }}</h3>
              <p class="text-slate-600 leading-relaxed text-sm">{{ f.description }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- ═══════════════ ALGORITHM ═══════════════ -->
    <section id="algorithm" class="py-24">
      <div class="max-w-7xl mx-auto px-6">
        <div class="flex flex-col lg:flex-row items-center gap-16">
          <!-- Cards grid -->
          <div class="flex-1 grid grid-cols-2 gap-4">
            <div class="space-y-4">
              <div class="bg-indigo-600 p-6 rounded-3xl text-white">
                <h4 class="font-bold mb-2">Priorité Haute</h4>
                <p class="text-xs opacity-80">Placé en premier dans les meilleurs créneaux.</p>
              </div>
              <div class="bg-slate-100 p-6 rounded-3xl">
                <h4 class="font-bold text-slate-900 mb-2">Disponibilités</h4>
                <p class="text-xs text-slate-500">L'algorithme scanne vos trous libres.</p>
              </div>
            </div>
            <div class="space-y-4 mt-8">
              <div class="bg-blue-500 p-6 rounded-3xl text-white">
                <h4 class="font-bold mb-2">Non-chevauchement</h4>
                <p class="text-xs opacity-80">Vérification stricte avant chaque insertion.</p>
              </div>
              <div class="bg-emerald-500 p-6 rounded-3xl text-white">
                <h4 class="font-bold mb-2">Équilibre</h4>
                <p class="text-xs opacity-80">Répartition intelligente sur la semaine.</p>
              </div>
            </div>
          </div>

          <!-- Text -->
          <div class="flex-1">
            <span class="text-indigo-600 font-bold tracking-widest uppercase text-sm mb-4 block">
              Le Moteur SyncStudy
            </span>
            <h2 class="text-4xl md:text-5xl font-black text-slate-900 mb-6 leading-tight">
              Un algorithme qui<br />travaille pour vous.
            </h2>
            <p class="text-lg text-slate-600 mb-8 leading-relaxed">
              Ne perdez plus des heures à organiser votre semaine. Notre moteur de génération
              automatique prend en compte vos objectifs, vos priorités et vos contraintes de
              temps pour créer un planning optimisé en un clic.
            </p>
            <ul class="space-y-4 mb-10">
              @for (item of algoPoints; track item) {
                <li class="flex items-center gap-3">
                  <div class="bg-indigo-100 p-1 rounded-full">
                    <span class="material-icons text-indigo-600 text-sm">check_circle</span>
                  </div>
                  <span class="font-medium text-slate-700">{{ item }}</span>
                </li>
              }
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════ CTA ═══════════════ -->
    <section id="collaborative" class="py-20 px-6">
      <div class="max-w-5xl mx-auto bg-indigo-600 rounded-[3rem] p-12 md:p-20 text-center
                  relative overflow-hidden shadow-2xl shadow-indigo-200">
        <div class="absolute inset-0 opacity-10 pointer-events-none">
          <div class="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-white rounded-full blur-3xl"></div>
          <div class="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-white rounded-full blur-3xl"></div>
        </div>
        <div class="relative z-10">
          <h2 class="text-4xl md:text-6xl font-black text-white mb-8">
            Prêt à transformer vos<br />méthodes d'étude ?
          </h2>
          <p class="text-xl text-indigo-100 mb-12 max-w-2xl mx-auto">
            Rejoignez des milliers d'étudiants qui utilisent SyncStudy pour exceller sans s'épuiser.
          </p>
          <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button (click)="openAuth('signup')"
                    class="bg-white text-indigo-600 px-10 py-5 rounded-2xl text-xl font-bold
                           hover:bg-indigo-50 transition-all shadow-xl">
              Créer mon compte
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════ FOOTER ═══════════════ -->
    <footer class="bg-slate-900 text-slate-400 py-16 px-6">
      <div class="max-w-7xl mx-auto">
        <div class="grid md:grid-cols-4 gap-12 mb-12">
          <div class="col-span-1 md:col-span-2">
            <div class="flex items-center gap-2 mb-6">
              <div class="bg-indigo-600 p-2 rounded-lg">
                <span class="material-icons text-white">school</span>
              </div>
              <span class="text-2xl font-black text-white">SyncStudy</span>
            </div>
            <p class="max-w-sm mb-8 leading-relaxed text-sm">
              La plateforme de planification intelligente conçue par des ingénieurs pour des ingénieurs.
            </p>
          </div>
          <div>
            <h4 class="text-white font-bold mb-6">Produit</h4>
            <ul class="space-y-3 text-sm">
              <li><a href="#features"  class="hover:text-white transition-colors">Fonctionnalités</a></li>
              <li><a href="#algorithm" class="hover:text-white transition-colors">Algorithme</a></li>
            </ul>
          </div>
          <div>
            <h4 class="text-white font-bold mb-6">Compagnie</h4>
            <ul class="space-y-3 text-sm">
              <li><a routerLink="/about"   class="hover:text-white transition-colors">À propos</a></li>
              <li><a routerLink="/contact" class="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>
        <div class="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between
                    items-center gap-4 text-sm">
          <p>© 2026 SyncStudy. Tous droits réservés.</p>
          <div class="flex gap-8">
            <a routerLink="/privacy" class="hover:text-white transition-colors">Confidentialité</a>
            <a routerLink="/terms"   class="hover:text-white transition-colors">Conditions</a>
          </div>
        </div>
      </div>
    </footer>

    <!-- ═══════════════ DÉMO MODAL ═══════════════ -->
    @if (showDemo()) {
      <app-demo-modal
        (close)="showDemo.set(false)"
        (startNow)="showDemo.set(false); openAuth('signup')">
      </app-demo-modal>
    }
  `,
})
export class LandingComponent {
  private dialog = inject(MatDialog);
  private router = inject(Router);

  scrolled   = signal(false);
  mobileOpen = signal(false);
  showDemo   = signal(false);

  @HostListener('window:scroll')
  onScroll() { this.scrolled.set(window.scrollY > 20); }

  heroBadges   = ['Sans publicité', 'Multi-plateforme', '100% Gratuit'];
  algoPoints   = [
    'Priorisation hiérarchique des matières',
    'Fractionnement intelligent des sessions longues',
    'Ajustement manuel par Drag & Drop',
    'Alertes en cas de surcharge',
  ];
  previewSessions = [
    { subject: 'Java & Spring Boot',    time: '18:00–20:00', color: '#6366f1', done: true  },
    { subject: 'Bases de Données',      time: '20:00–22:00', color: '#10b981', done: true  },
    { subject: 'Réseaux Informatiques', time: '14:00–16:00', color: '#ec4899', done: false },
    { subject: 'Gestion de Projet',     time: '16:00–17:00', color: '#f59e0b', done: false },
  ];
  features = [
    { icon: 'bolt',       bg: 'bg-amber-50',   iconColor: 'text-amber-500',   title: 'Planification Intelligente',  description: "Notre algorithme place vos sessions d'étude en évitant les chevauchements et en respectant vos priorités." },
    { icon: 'group',      bg: 'bg-indigo-50',  iconColor: 'text-indigo-500',  title: 'Collaboration Dynamique',     description: "Créez des groupes de travail, partagez des créneaux et favorisez l'entraide entre pairs." },
    { icon: 'bar_chart',  bg: 'bg-emerald-50', iconColor: 'text-emerald-500', title: 'Analyse de Productivité',     description: 'Visualisez vos heures d\'étude via des statistiques interactives pour un meilleur suivi.' },
    { icon: 'schedule',   bg: 'bg-rose-50',    iconColor: 'text-rose-500',    title: 'Gestion du Temps',            description: 'Définissez vos disponibilités et contraintes pour un emploi du temps équilibré et sans stress.' },
  ];

  openAuth(mode: 'login' | 'signup'): void {
    const ref = this.dialog.open(AuthDialogComponent, {
      width: '440px',
      panelClass: 'syncstudy-dialog',
      data: { mode },
    });
    ref.afterClosed().subscribe((loggedIn) => {
      if (loggedIn) this.router.navigate(['/app/dashboard']);
    });
  }
}

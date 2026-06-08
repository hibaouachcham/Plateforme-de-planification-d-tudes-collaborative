import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
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
          <a routerLink="/"      class="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Accueil</a>
          <a routerLink="/about" class="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">À propos</a>
        </div>
      </div>
    </nav>

    <div class="pt-20">

      <!-- ═══════════════ HERO ═══════════════ -->
      <section class="py-20 bg-gradient-to-br from-indigo-50 via-white to-blue-50 relative overflow-hidden">
        <div class="absolute top-0 right-0 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-30 pointer-events-none"></div>
        <div class="max-w-3xl mx-auto px-6 text-center relative z-10">
          <span class="inline-block px-4 py-1.5 mb-6 text-sm font-semibold tracking-wide
                       text-indigo-600 uppercase bg-indigo-50 border border-indigo-100 rounded-full">
            Contactez-nous
          </span>
          <h1 class="text-5xl font-black text-slate-900 leading-tight mb-5">
            On est là pour vous aider
          </h1>
          <p class="text-lg text-slate-600 leading-relaxed">
            Une question, un bug, une suggestion ? Écrivez-nous, nous répondons sous 24h.
          </p>
        </div>
      </section>

      <!-- ═══════════════ INFOS + FORMULAIRE ═══════════════ -->
      <section class="py-20 bg-white">
        <div class="max-w-6xl mx-auto px-6">
          <div class="grid md:grid-cols-5 gap-16">

            <!-- Infos de contact -->
            <div class="md:col-span-2 space-y-8">
              <div>
                <h2 class="text-2xl font-black text-slate-900 mb-6">Informations</h2>
                <div class="space-y-5">
                  @for (info of contactInfos; track info.label) {
                    <div class="flex items-start gap-4">
                      <div class="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span class="material-icons text-indigo-600">{{ info.icon }}</span>
                      </div>
                      <div>
                        <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">{{ info.label }}</p>
                        <p class="text-sm font-semibold text-slate-800">{{ info.value }}</p>
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Réseaux sociaux -->
              <div>
                <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Suivez-nous</p>
                <div class="flex gap-3">
                  @for (social of socials; track social.label) {
                    <div [title]="social.label"
                         class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center
                                hover:bg-indigo-100 hover:text-indigo-600 transition-all cursor-pointer text-slate-500">
                      <span class="material-icons text-lg">{{ social.icon }}</span>
                    </div>
                  }
                </div>
              </div>

              <!-- Badge temps de réponse -->
              <div class="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-center gap-4">
                <div class="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <span class="material-icons text-emerald-600">schedule</span>
                </div>
                <div>
                  <p class="font-bold text-emerald-800 text-sm">Réponse rapide</p>
                  <p class="text-xs text-emerald-600">Nous répondons généralement sous 24h</p>
                </div>
              </div>
            </div>

            <!-- Formulaire -->
            <div class="md:col-span-3">
              @if (!sent()) {
                <div class="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
                  <h2 class="text-2xl font-black text-slate-900 mb-6">Envoyer un message</h2>
                  <form [formGroup]="form" (ngSubmit)="submit()" autocomplete="off" class="space-y-5">
                    <div class="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Nom complet</label>
                        <input formControlName="name" type="text" placeholder="Votre nom"
                               [class]="fieldClass('name')" />
                        @if (f['name'].invalid && f['name'].touched) {
                          <p class="text-xs text-red-500 mt-1">Nom requis</p>
                        }
                      </div>
                      <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Email</label>
                        <input formControlName="email" type="email" placeholder="vous@exemple.com"
                               [class]="fieldClass('email')" />
                        @if (f['email'].invalid && f['email'].touched) {
                          <p class="text-xs text-red-500 mt-1">Email invalide</p>
                        }
                      </div>
                    </div>

                    <div>
                      <label class="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Sujet</label>
                      <select formControlName="subject" [class]="fieldClass('subject')">
                        <option value="">Choisir un sujet…</option>
                        @for (opt of subjectOptions; track opt) {
                          <option [value]="opt">{{ opt }}</option>
                        }
                      </select>
                      @if (f['subject'].invalid && f['subject'].touched) {
                        <p class="text-xs text-red-500 mt-1">Veuillez choisir un sujet</p>
                      }
                    </div>

                    <div>
                      <label class="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Message</label>
                      <textarea formControlName="message" rows="5"
                                placeholder="Décrivez votre demande en détail…"
                                [class]="fieldClass('message') + ' resize-none'"></textarea>
                      @if (f['message'].invalid && f['message'].touched) {
                        <p class="text-xs text-red-500 mt-1">Message requis (minimum 20 caractères)</p>
                      }
                    </div>

                    <button type="submit" [disabled]="sending()"
                            class="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-sm
                                   hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100
                                   disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      @if (sending()) {
                        <span class="material-icons animate-spin text-base">sync</span>
                        Envoi en cours…
                      } @else {
                        <span class="material-icons text-base">send</span>
                        Envoyer le message
                      }
                    </button>
                  </form>
                </div>
              } @else {
                <!-- Confirmation -->
                <div class="bg-emerald-50 border border-emerald-100 rounded-3xl p-12 text-center">
                  <div class="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span class="material-icons text-emerald-600 text-4xl">mark_email_read</span>
                  </div>
                  <h3 class="text-2xl font-black text-slate-900 mb-3">Message envoyé !</h3>
                  <p class="text-slate-600 mb-8">
                    Merci pour votre message. Nous vous répondrons à
                    <strong>{{ f['email'].value }}</strong> sous 24h.
                  </p>
                  <button (click)="reset()"
                          class="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold
                                 hover:bg-indigo-700 transition-all">
                    Envoyer un autre message
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
      </section>

      <!-- ═══════════════ FAQ ═══════════════ -->
      <section class="py-20 bg-slate-50">
        <div class="max-w-3xl mx-auto px-6">
          <div class="text-center mb-14">
            <span class="text-xs font-bold text-indigo-500 uppercase tracking-widest">FAQ</span>
            <h2 class="text-4xl font-black text-slate-900 mt-3">Questions fréquentes</h2>
          </div>
          <div class="space-y-4">
            @for (faq of faqs; track faq.q; let i = $index) {
              <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden
                          hover:border-indigo-100 transition-all shadow-sm">
                <button type="button" (click)="toggleFaq(i)"
                        class="w-full flex items-center justify-between px-6 py-5 text-left gap-4">
                  <span class="font-bold text-slate-900 text-sm">{{ faq.q }}</span>
                  <span class="material-icons text-indigo-500 flex-shrink-0 transition-transform"
                        [class.rotate-180]="openFaq() === i">
                    expand_more
                  </span>
                </button>
                @if (openFaq() === i) {
                  <div class="px-6 pb-5">
                    <p class="text-sm text-slate-600 leading-relaxed">{{ faq.a }}</p>
                  </div>
                }
              </div>
            }
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
export class ContactComponent {
  private fb = inject(FormBuilder);

  sent    = signal(false);
  sending = signal(false);
  openFaq = signal<number | null>(null);

  form = this.fb.group({
    name:    ['', [Validators.required, Validators.minLength(2)]],
    email:   ['', [Validators.required, Validators.email]],
    subject: ['', Validators.required],
    message: ['', [Validators.required, Validators.minLength(20)]],
  });

  get f() { return this.form.controls; }

  fieldClass(field: string): string {
    const ctrl = this.f[field as keyof typeof this.f];
    const base = 'w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all';
    return base + (ctrl.invalid && ctrl.touched ? ' border-red-300' : ' border-slate-200');
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.sending.set(true);
    // Simulation d'envoi (à remplacer par un vrai appel HTTP si besoin)
    setTimeout(() => {
      this.sending.set(false);
      this.sent.set(true);
    }, 1200);
  }

  reset(): void {
    this.form.reset();
    this.sent.set(false);
  }

  toggleFaq(i: number): void {
    this.openFaq.set(this.openFaq() === i ? null : i);
  }

  subjectOptions = [
    'Problème technique',
    'Compte suspendu ou bloqué',
    'Réinitialisation de mot de passe',
    'Suggestion ou amélioration',
    'Collaboration / Partenariat',
    'Autre',
  ];

  contactInfos = [
    { icon: 'email',    label: 'Email',       value: 'support@syncstudy.ma'   },
    { icon: 'schedule', label: 'Disponibles', value: 'Lun – Ven, 9h – 18h'   },
    { icon: 'location_on', label: 'Localisation', value: 'Khouribga, Maroc'    },
  ];

  socials = [
    { icon: 'language',  label: 'Site web'  },
    { icon: 'chat',      label: 'Discord'   },
    { icon: 'code',      label: 'GitHub'    },
  ];

  faqs = [
    {
      q: 'Comment réinitialiser mon mot de passe ?',
      a: 'Cliquez sur "Connexion" puis sur "Mot de passe oublié". Entrez votre email, créez un nouveau mot de passe sécurisé et confirmez. La mise à jour est immédiate.',
    },
    {
      q: 'Comment rejoindre un groupe de travail ?',
      a: 'Depuis votre tableau de bord, rendez-vous dans la section "Collaboration". Cliquez sur "Rejoindre un groupe" et entrez le code d\'invitation fourni par le créateur du groupe.',
    },
    {
      q: 'Puis-je utiliser SyncStudy gratuitement ?',
      a: 'Oui, SyncStudy est entièrement gratuit. Toutes les fonctionnalités — génération de planning, collaboration en groupe, suivi de progression — sont disponibles sans abonnement.',
    },
    {
      q: 'Comment modifier mes disponibilités ?',
      a: 'Dans l\'espace étudiant, accédez à "Disponibilités" dans le menu latéral. Vous pouvez y définir vos créneaux libres par jour et par heure. Le planning se régénère automatiquement.',
    },
    {
      q: 'Mon compte a été suspendu. Que faire ?',
      a: 'Un compte suspendu ne peut plus accéder à l\'application. Contactez-nous via ce formulaire avec votre email et une description de votre situation. Nous traiterons votre demande sous 24h.',
    },
    {
      q: 'Comment contacter le support en cas d\'urgence ?',
      a: 'Envoyez un email directement à support@syncstudy.ma avec l\'objet "URGENT". Pour les problèmes critiques, nous nous efforçons de répondre dans les 4 heures ouvrées.',
    },
  ];
}

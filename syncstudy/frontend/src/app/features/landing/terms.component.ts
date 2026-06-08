import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- NAVBAR -->
    <nav class="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md shadow-sm px-6 py-4">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <a routerLink="/" class="flex items-center gap-2">
          <div class="bg-indigo-600 p-2 rounded-xl">
            <span class="material-icons text-white">school</span>
          </div>
          <span class="text-2xl font-black text-slate-900">SyncStudy</span>
        </a>
        <div class="flex items-center gap-4">
          <a routerLink="/"        class="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Accueil</a>
          <a routerLink="/contact" class="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Contact</a>
        </div>
      </div>
    </nav>

    <div class="pt-20">
      <!-- HERO -->
      <section class="py-16 bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        <div class="max-w-3xl mx-auto px-6 text-center">
          <span class="inline-block px-4 py-1.5 mb-4 text-sm font-semibold tracking-wide
                       text-indigo-600 uppercase bg-indigo-50 border border-indigo-100 rounded-full">
            Conditions d'utilisation
          </span>
          <h1 class="text-4xl font-black text-slate-900 mb-4">Règles d'utilisation de SyncStudy</h1>
          <p class="text-slate-500 text-sm">Dernière mise à jour : mai 2026</p>
        </div>
      </section>

      <!-- RÉSUMÉ RAPIDE -->
      <section class="py-8 bg-amber-50 border-y border-amber-100">
        <div class="max-w-3xl mx-auto px-6">
          <div class="flex items-start gap-3">
            <span class="material-icons text-amber-500 text-xl flex-shrink-0 mt-0.5">lightbulb</span>
            <div>
              <p class="font-bold text-amber-800 text-sm mb-1">Résumé en quelques mots</p>
              <p class="text-amber-700 text-sm leading-relaxed">
                SyncStudy est gratuit et destiné aux étudiants. Utilisez-le de façon responsable,
                respectez les autres utilisateurs et ne détournez pas la plateforme de son usage académique.
                En créant un compte, vous acceptez ces conditions.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- CONTENU -->
      <section class="py-16 bg-white">
        <div class="max-w-3xl mx-auto px-6 space-y-10">

          @for (section of sections; track section.title) {
            <div>
              <h2 class="text-xl font-black text-slate-900 mb-4 flex items-center gap-3">
                <span class="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span class="material-icons text-indigo-600 text-base">{{ section.icon }}</span>
                </span>
                {{ section.title }}
              </h2>
              <div class="text-slate-600 leading-relaxed text-sm space-y-3">
                @for (para of section.paragraphs; track para) {
                  <p>{{ para }}</p>
                }
                @if (section.items) {
                  <ul class="list-disc list-inside space-y-1 pl-2">
                    @for (item of section.items; track item) {
                      <li>{{ item }}</li>
                    }
                  </ul>
                }
              </div>
            </div>
          }

          <!-- Contact -->
          <div class="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex items-start gap-4">
            <span class="material-icons text-indigo-600 text-2xl flex-shrink-0 mt-0.5">gavel</span>
            <div>
              <p class="font-bold text-slate-900 mb-1">Des questions sur ces conditions ?</p>
              <p class="text-sm text-slate-600">
                Écrivez-nous à
                <a href="mailto:support&#64;syncstudy.ma" class="text-indigo-600 font-semibold hover:underline">
                  support&#64;syncstudy.ma
                </a>.
                Nous sommes disponibles du lundi au vendredi de 9h à 18h.
              </p>
            </div>
          </div>

        </div>
      </section>

      <!-- FOOTER -->
      <footer class="bg-slate-900 text-slate-400 py-8 px-6 text-center text-sm">
        © 2026 SyncStudy. Tous droits réservés.
        <span class="mx-3 text-slate-600">·</span>
        <a routerLink="/about"   class="hover:text-white transition-colors">À propos</a>
        <span class="mx-3 text-slate-600">·</span>
        <a routerLink="/contact" class="hover:text-white transition-colors">Contact</a>
        <span class="mx-3 text-slate-600">·</span>
        <a routerLink="/privacy" class="hover:text-white transition-colors">Confidentialité</a>
        <span class="mx-3 text-slate-600">·</span>
        <a routerLink="/terms"   class="hover:text-white transition-colors">Conditions</a>
      </footer>
    </div>
  `,
})
export class TermsComponent {
  sections = [
    {
      icon: 'check_circle',
      title: '1. Acceptation des conditions',
      paragraphs: [
        'En créant un compte sur SyncStudy ou en utilisant nos services, vous acceptez pleinement et sans réserve les présentes conditions d\'utilisation.',
        'Si vous n\'acceptez pas ces conditions, veuillez ne pas utiliser la plateforme.',
      ],
    },
    {
      icon: 'person',
      title: '2. Accès et création de compte',
      paragraphs: [
        'SyncStudy est accessible gratuitement à toute personne disposant d\'une adresse email valide. L\'inscription est ouverte à tous les étudiants.',
      ],
      items: [
        'Vous devez fournir des informations exactes lors de l\'inscription',
        'Vous êtes responsable de la confidentialité de votre mot de passe',
        'Vous devez nous notifier immédiatement en cas d\'accès non autorisé à votre compte',
        'Un seul compte par personne est autorisé',
      ],
    },
    {
      icon: 'school',
      title: '3. Usage autorisé',
      paragraphs: [
        'SyncStudy est exclusivement destiné à des fins académiques et éducatives. Les usages autorisés comprennent :',
      ],
      items: [
        'Créer et gérer votre planning d\'études personnel',
        'Rejoindre et créer des groupes de travail collaboratifs',
        'Partager des sessions d\'étude avec d\'autres étudiants',
        'Suivre votre progression académique',
      ],
    },
    {
      icon: 'block',
      title: '4. Usages interdits',
      paragraphs: [
        'Il est strictement interdit d\'utiliser SyncStudy pour :',
      ],
      items: [
        'Publier du contenu offensant, discriminatoire ou illégal',
        'Harceler, menacer ou porter atteinte à d\'autres utilisateurs',
        'Tenter de pirater, compromettre ou surcharger nos serveurs',
        'Créer plusieurs comptes pour contourner une suspension',
        'Utiliser la plateforme à des fins commerciales non autorisées',
        'Collecter des données sur d\'autres utilisateurs sans leur consentement',
      ],
    },
    {
      icon: 'groups',
      title: '5. Groupes de travail',
      paragraphs: [
        'En rejoignant ou en créant un groupe, vous acceptez que votre nom et votre email soient visibles des autres membres du groupe.',
        'Le créateur d\'un groupe est responsable des activités qui s\'y déroulent. Tout groupe dont le contenu viole ces conditions pourra être supprimé sans préavis.',
      ],
    },
    {
      icon: 'copyright',
      title: '6. Propriété intellectuelle',
      paragraphs: [
        'Tous les éléments de SyncStudy (code source, design, algorithmes, textes, logos) sont la propriété exclusive de l\'équipe SyncStudy et sont protégés par le droit de la propriété intellectuelle.',
        'Toute reproduction, distribution ou modification sans autorisation écrite préalable est strictement interdite.',
      ],
    },
    {
      icon: 'pause_circle',
      title: '7. Suspension et résiliation',
      paragraphs: [
        'Nous nous réservons le droit de suspendre ou de résilier tout compte en cas de violation des présentes conditions, et ce, sans préavis et sans remboursement.',
        'Vous pouvez supprimer votre compte à tout moment en contactant notre support. La suppression est définitive et entraîne l\'effacement de vos données conformément à notre politique de confidentialité.',
      ],
    },
    {
      icon: 'warning',
      title: '8. Limitation de responsabilité',
      paragraphs: [
        'SyncStudy est fourni "en l\'état". Nous ne garantissons pas une disponibilité ininterrompue du service et déclinons toute responsabilité en cas de perte de données liée à une défaillance technique.',
        'En aucun cas l\'équipe SyncStudy ne pourra être tenue responsable de dommages indirects résultant de l\'utilisation ou de l\'impossibilité d\'utiliser la plateforme.',
      ],
    },
    {
      icon: 'edit_document',
      title: '9. Modifications des conditions',
      paragraphs: [
        'Nous pouvons modifier ces conditions à tout moment. Les changements importants seront communiqués par email ou par notification sur la plateforme au moins 15 jours avant leur entrée en vigueur.',
        'La poursuite de l\'utilisation de SyncStudy après modification vaut acceptation des nouvelles conditions.',
      ],
    },
    {
      icon: 'gavel',
      title: '10. Droit applicable',
      paragraphs: [
        'Les présentes conditions sont régies par le droit marocain. En cas de litige, les parties s\'engagent à rechercher une solution amiable avant tout recours judiciaire.',
      ],
    },
  ];
}

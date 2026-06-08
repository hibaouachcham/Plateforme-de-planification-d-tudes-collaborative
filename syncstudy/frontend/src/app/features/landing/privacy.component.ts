import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-privacy',
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
      <section class="py-16 bg-gradient-to-br from-indigo-50 via-white to-blue-50">
        <div class="max-w-3xl mx-auto px-6 text-center">
          <span class="inline-block px-4 py-1.5 mb-4 text-sm font-semibold tracking-wide
                       text-indigo-600 uppercase bg-indigo-50 border border-indigo-100 rounded-full">
            Politique de confidentialité
          </span>
          <h1 class="text-4xl font-black text-slate-900 mb-4">Vos données, notre responsabilité</h1>
          <p class="text-slate-500 text-sm">Dernière mise à jour : mai 2026</p>
        </div>
      </section>

      <!-- CONTENU -->
      <section class="py-16 bg-white">
        <div class="max-w-3xl mx-auto px-6">
          <div class="prose prose-slate max-w-none space-y-10">

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

          </div>

          <!-- Contact DPO -->
          <div class="mt-14 bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex items-start gap-4">
            <span class="material-icons text-indigo-600 text-2xl flex-shrink-0 mt-0.5">contact_support</span>
            <div>
              <p class="font-bold text-slate-900 mb-1">Une question sur vos données ?</p>
              <p class="text-sm text-slate-600">
                Contactez-nous à
                <a href="mailto:support&#64;syncstudy.ma" class="text-indigo-600 font-semibold hover:underline">
                  support&#64;syncstudy.ma
                </a>
                — nous nous engageons à répondre sous 72h.
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
export class PrivacyComponent {
  sections = [
    {
      icon: 'info',
      title: '1. Qui sommes-nous ?',
      paragraphs: [
        'SyncStudy est une plateforme de planification académique intelligente développée par des étudiants ingénieurs au Maroc. Notre siège est basé à Khouribga.',
        'En tant que responsable du traitement de vos données, nous nous engageons à protéger votre vie privée conformément aux lois applicables.',
      ],
    },
    {
      icon: 'database',
      title: '2. Données collectées',
      paragraphs: [
        'Nous collectons uniquement les données nécessaires au bon fonctionnement de la plateforme :',
      ],
      items: [
        'Informations d\'identité : nom complet, adresse email',
        'Informations académiques : école, niveau d\'études',
        'Informations optionnelles : numéro de téléphone, date de naissance',
        'Données d\'utilisation : sessions créées, disponibilités renseignées, groupes rejoints',
        'Données techniques : adresse IP, type de navigateur, horodatage des connexions',
      ],
    },
    {
      icon: 'verified_user',
      title: '3. Utilisation de vos données',
      paragraphs: [
        'Vos données sont utilisées exclusivement pour :',
      ],
      items: [
        'Créer et gérer votre compte utilisateur',
        'Générer votre planning d\'étude personnalisé',
        'Vous permettre de collaborer avec d\'autres étudiants',
        'Vous envoyer des notifications liées à votre activité sur la plateforme',
        'Améliorer nos services et corriger les anomalies techniques',
      ],
    },
    {
      icon: 'share',
      title: '4. Partage des données',
      paragraphs: [
        'Nous ne vendons, ne louons, ni ne partageons vos données personnelles avec des tiers à des fins commerciales.',
        'Vos données peuvent être partagées uniquement dans les cas suivants : avec les membres d\'un groupe de travail que vous avez rejoint (nom et email visibles), ou si la loi l\'exige.',
      ],
    },
    {
      icon: 'lock',
      title: '5. Sécurité',
      paragraphs: [
        'Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre tout accès non autorisé, perte ou divulgation.',
        'Les mots de passe sont hachés avec BCrypt et ne sont jamais stockés en clair. Les communications sont sécurisées par HTTPS. Les tokens d\'authentification ont une durée de vie limitée.',
      ],
    },
    {
      icon: 'manage_accounts',
      title: '6. Vos droits',
      paragraphs: [
        'Conformément à la réglementation en vigueur, vous disposez des droits suivants :',
      ],
      items: [
        'Droit d\'accès : obtenir une copie de vos données personnelles',
        'Droit de rectification : corriger des informations inexactes',
        'Droit à l\'effacement : demander la suppression de votre compte et de vos données',
        'Droit à la portabilité : recevoir vos données dans un format structuré',
        'Droit d\'opposition : vous opposer à certains traitements',
      ],
    },
    {
      icon: 'cookie',
      title: '7. Cookies',
      paragraphs: [
        'SyncStudy utilise uniquement des cookies techniques essentiels au fonctionnement de la plateforme (authentification, préférences de session). Aucun cookie publicitaire ou de tracking n\'est utilisé.',
      ],
    },
    {
      icon: 'update',
      title: '8. Modifications',
      paragraphs: [
        'Nous pouvons mettre à jour cette politique de confidentialité. En cas de modification substantielle, vous serez informé par email ou via une notification sur la plateforme. La date de dernière mise à jour est indiquée en haut de cette page.',
      ],
    },
  ];
}

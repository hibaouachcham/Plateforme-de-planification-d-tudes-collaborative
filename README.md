# SyncStudy — Documentation Technique

> Plateforme de planification d'études collaborative destinée aux étudiants ingénieurs.  
> Architecture full-stack : API REST Spring Boot + SPA Angular + Temps réel Socket.IO + Base de données MongoDB.

---

## Table des matières

1. [Présentation du projet](#1-présentation-du-projet)
2. [Fonctionnalités par profil utilisateur](#2-fonctionnalités-par-profil-utilisateur)
3. [Architecture générale](#3-architecture-générale)
4. [Stack technique — Backend](#4-stack-technique--backend)
5. [Stack technique — Frontend](#5-stack-technique--frontend)
6. [Base de données](#6-base-de-données)
7. [Temps réel — Socket.IO](#7-temps-réel--socketio)
8. [Sécurité](#8-sécurité)
9. [Algorithme de planification — détail complet](#9-algorithme-de-planification--détail-complet)
10. [Structure des répertoires](#10-structure-des-répertoires)
11. [Variables d'environnement](#11-variables-denvironnement)
12. [Lancer le projet en local](#12-lancer-le-projet-en-local)

---

## 1. Présentation du projet

SyncStudy est une application web de gestion du planning d'études. Elle permet à un étudiant de :

- Gérer ses **matières** (cours et projets) avec priorité et objectif hebdomadaire
- Définir ses **créneaux de disponibilité** hebdomadaires
- Générer automatiquement un **planning optimisé** via un algorithme Greedy
- Suivre ses **sessions d'étude** (démarrer, pausser, terminer, annoter)
- Collaborer au sein de **groupes d'étude** avec chat et sessions partagées
- Consulter des **analytics** sur ses heures de travail et sa progression
- Recevoir des **notifications** en temps réel

Un espace **administrateur** permet la gestion des utilisateurs (activation, suspension, suppression, réinitialisation de mot de passe).

---

## 2. Fonctionnalités par profil utilisateur

L'application distingue deux profils : **Étudiant** (rôle `student`) et **Administrateur** (rôle `admin`).

---

### 2.1 Profil Étudiant

#### Authentification et compte

- **Inscription** avec nom, e-mail, mot de passe (validation forte : longueur ≥ 8, majuscule, chiffre, caractère spécial), établissement scolaire, niveau d'études, téléphone et date de naissance (optionnels). Un **indice mémo** de mot de passe peut être enregistré pour faciliter la récupération.
- **Connexion** par e-mail + mot de passe. Après 2 échecs consécutifs, l'indice mémo est affiché pour aider l'utilisateur.
- **Mot de passe oublié** : réinitialisation directe via e-mail + nouvel mot de passe + indice mémo (sans lien par e-mail imposé).
- **Profil personnel** : modification du nom, de l'établissement, du niveau, du téléphone, de la date de naissance et de l'avatar.
- **Changement de mot de passe** depuis les paramètres (avec vérification de l'ancien mot de passe).
- **Déconnexion** sécurisée avec invalidation du refresh token côté serveur.

---

#### Matières (`/app/subjects`)

- **Créer une matière** avec : nom, couleur, niveau de priorité (Haute / Moyenne / Basse), objectif hebdomadaire en heures, durée minimale et maximale de session, mode de travail (Privé / Groupe).
- **Modifier** une matière existante (tous les champs).
- **Supprimer** une matière (les sessions associées restent mais sans lien).
- **Recherche et filtrage** par nom et par priorité.
- Chaque matière affiche la progression hebdomadaire (heures planifiées vs objectif) via une barre de progression.

---

#### Projets (`/app/projects`)

Fonctionnement identique aux matières mais avec `studyType: 'project'`. Les projets sont gérés dans un espace dédié, séparé visuellement des cours. Toutes les opérations CRUD s'appliquent de la même façon.

---

#### Disponibilités (`/app/settings`)

- **Définir des créneaux de disponibilité** hebdomadaires (jour de la semaine + heure de début + heure de fin), qui servent de contraintes d'entrée à l'algorithme de génération.
- **Modifier ou supprimer** des créneaux.
- L'application détecte les **chevauchements de créneaux** et propose une fusion automatique avant toute génération de planning.

---

#### Planning et calendrier (`/app/planning`, `/app/calendar`)

- **Tableau de bord** : vue synthétique de la semaine courante avec les sessions planifiées, les objectifs par matière et la progression globale.
- **Générer un planning automatique** : l'algorithme Greedy analyse les matières, les objectifs hebdomadaires, les créneaux de disponibilité et les sessions existantes, puis génère un planning optimisé pour la semaine courante. L'utilisateur peut spécifier des **jours de repos** à exclure.
- **Rapport de sous-objectif** : si certaines heures ne peuvent pas être planifiées (créneaux insuffisants), l'application affiche les matières concernées avec le détail des heures manquantes et une recommandation d'ajout de disponibilités.
- **Calendrier interactif** (FullCalendar) en vues mois, semaine et jour : affichage de toutes les sessions, navigation, glisser-déposer pour repositionner une session.
- **Créer une session manuellement** : définir la matière, le créneau horaire, le titre, les objectifs de la session.
- **Modifier ou supprimer** une session.

---

#### Sessions d'étude (`/app/sessions`)

- **Démarrer une session** depuis le calendrier ou la liste : lance un chronomètre en temps réel.
- **Pausser / Reprendre** une session en cours (le temps écoulé est conservé).
- **Terminer une session** : enregistre la durée réelle, met à jour le statut en `completed`.
- **Annoter une session** pendant ou après : notes libres, objectifs de session, liste de tâches (to-do), flashcards, éléments de cours.
- **Historique des sessions** : liste de toutes les sessions passées avec filtres par statut, par matière et par date.
- **Détail d'une session** : visualisation complète du contenu (notes, flashcards, to-do, durée réelle, etc.).
- **Partager une session** avec un groupe de travail : la session devient une session de groupe et est copiée chez tous les membres.

---

#### Groupes de travail (`/app/groups`)

- **Créer un groupe** avec nom, description et couleur. Un **code d'invitation** unique de 8 caractères est généré automatiquement.
- **Rejoindre un groupe** par code d'invitation (saisie manuelle) ou depuis la liste des groupes disponibles.
- **Chat en temps réel** (Socket.IO) dans chaque groupe : envoi de messages texte, affichage de la présence (membres en ligne), historique des messages.
- **Inviter un membre** par e-mail (l'utilisateur reçoit une notification in-app et un e-mail si le serveur SMTP est configuré).
- **Gérer les membres** (propriétaire uniquement) : retirer un membre du groupe.
- **Quitter un groupe** (membre) ou **dissoudre le groupe** (propriétaire uniquement).
- **Modifier le groupe** : nom, description, liste des objectifs/tâches partagés du groupe.
- **Sessions de groupe partagées** : planifier une session commune visible dans le calendrier de tous les membres.

---

#### Analytics (`/app/analytics`)

- **Heures travaillées** par semaine : graphique en barres montrant la répartition entre les matières.
- **Progression par matière** : comparaison entre objectif hebdomadaire et heures effectivement complétées.
- **Heatmap d'activité** : carte de chaleur des jours et heures les plus productifs.
- **Statistiques globales** : total d'heures, nombre de sessions complétées, taux de complétion.
- **Indicateurs par matière** : heures planifiées, heures réelles, pourcentage d'objectif atteint.

---

#### Notifications (`/app/notifications`)

- Réception de notifications in-app pour : invitations de groupe, nouvelles sessions partagées, rappels de sessions à venir.
- **Marquer comme lu** individuellement ou en masse.
- Badge de compteur sur l'icône de notification dans l'interface.

---

#### Paramètres (`/app/settings`)

- **Préférences d'étude** : durée de session préférée (en minutes), jours de repos hebdomadaires.
- **Gestion des disponibilités** : ajout, modification, suppression des créneaux.
- **Modification du profil** et **changement de mot de passe**.

---

### 2.2 Profil Administrateur

L'administrateur accède à un espace dédié (`/app/admin`) avec des droits étendus sur la gestion de la plateforme.

#### Tableau de bord admin

- **KPIs globaux** : nombre total d'utilisateurs, sessions effectuées, groupes actifs, matières créées, taux d'activité de la plateforme.
- Vue synthétique de l'état général de l'application.

#### Gestion des utilisateurs

- **Liste paginée** de tous les utilisateurs avec leurs informations (nom, e-mail, rôle, établissement, statut, date d'inscription).
- **Recherche et filtrage** par nom, e-mail, statut (actif / suspendu) ou rôle.
- **Créer un compte** manuellement (nom, e-mail, mot de passe, école, niveau, rôle).
- **Activer / Suspendre** un compte : un compte suspendu ne peut plus se connecter (retour HTTP 403 à la tentative de connexion).
- **Réinitialiser le mot de passe** d'un utilisateur (envoi d'un e-mail de réinitialisation).
- **Supprimer définitivement** un compte utilisateur (hors comptes admin).

---

## 3. Architecture générale

```
┌─────────────────────────────────────────────────────────────────┐
│                         Navigateur                              │
│   Angular 17 SPA  (port 4200 en dev / dist/ en production)      │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │  Modules : Auth · Planning · Subjects · Projects         │  │
│   │            Sessions · Groups · Analytics · Admin         │  │
│   └──────────┬────────────────────────────┬──────────────────┘  │
│              │ HTTP REST /api             │ WebSocket /socket.io │
└──────────────┼────────────────────────────┼─────────────────────┘
               │                            │
   ┌───────────▼────────────┐   ┌───────────▼────────────────┐
   │  Spring Boot 3.2       │   │  Netty-SocketIO Server     │
   │  (port 8080)           │   │  (port 9092)               │
   │  API REST / Sécurité   │   │  Chat · Présence · Sessions│
   └───────────┬────────────┘   └────────────────────────────┘
               │
   ┌───────────▼────────────┐
   │  MongoDB               │
   │  (port 27017)          │
   │  Base : syncstudy      │
   └────────────────────────┘
```

Le frontend Angular communique avec le backend Spring Boot via un **proxy de développement** (`/api → localhost:8080`, `/socket.io → localhost:9092`). En production, un reverse proxy (nginx ou équivalent) assure ce routage.

---

## 4. Stack technique — Backend

### Langage et runtime

| Élément     | Version  |
|-------------|----------|
| Java        | 21 (LTS) |
| Maven       | 3.x      |
| Spring Boot | 3.2.5    |

### Dépendances principales

| Bibliothèque | Rôle |
|---|---|
| `spring-boot-starter-web` | Serveur HTTP embarqué (Tomcat), contrôleurs REST |
| `spring-boot-starter-security` | Filtres de sécurité, CORS, gestion des accès |
| `spring-boot-starter-data-mongodb` | ODM MongoDB via Spring Data (Repositories déclaratifs) |
| `spring-boot-starter-validation` | Validation des DTOs (`@Valid`, `@NotBlank`, etc.) |
| `spring-boot-starter-mail` | Envoi d'e-mails (réinitialisation de mot de passe, invitations) |
| `jjwt-api / jjwt-impl / jjwt-jackson` 0.11.5 | Génération et validation des JSON Web Tokens (HMAC-SHA256) |
| `netty-socketio` 2.0.14 | Serveur Socket.IO embarqué (chat temps réel, présence) |
| `lombok` 1.18.32 | Réduction du code boilerplate (getters, setters, builders) |
| `spring-boot-starter-test` | Tests unitaires et d'intégration (JUnit 5) |

### Pattern architectural backend

Le backend suit une architecture en couches strictes :

- **Controllers** — exposition des endpoints REST, validation des entrées, conversion DTO ↔ modèle
- **Services** — logique métier, transactions, orchestration entre repositories
- **Repositories** — accès MongoDB via interfaces Spring Data (aucun SQL)
- **Models** — entités MongoDB annotées `@Document`
- **DTOs** — objets de transfert séparés pour les requêtes (`request/`) et les réponses (`response/`)
- **Security** — filtre JWT (`JwtAuthFilter`), configuration Spring Security, rate limiter
- **Config** — CORS, Socket.IO, JWT properties, initialisation des comptes de démo

### Endpoints REST exposés

| Domaine          | Préfixe              | Opérations principales |
|------------------|----------------------|------------------------|
| Authentification | `/auth`              | login, register, refresh, logout, forgot-password, reset-password, password-hint |
| Utilisateur      | `/users/me`          | GET (profil), PUT (profil), PUT (mot de passe) |
| Matières         | `/subjects`          | CRUD complet |
| Disponibilités   | `/availabilities`    | GET, POST (remplacement complet), DELETE |
| Sessions         | `/sessions`          | CRUD, generate, start, stop, share, sync-group, migrate |
| Groupes          | `/groups`            | CRUD, join (par code), join (par ID), invite, leave, messages |
| Notifications    | `/notifications`     | GET, mark-read, mark-all-read |
| Administration   | `/admin`             | dashboard KPIs, users CRUD, status, reset-password |

Toutes les routes sont préfixées par `/api` (`server.servlet.context-path=/api`).

---

## 5. Stack technique — Frontend

### Langage et framework

| Élément    | Version |
|------------|---------|
| TypeScript | 5.4     |
| Angular    | 17.3    |
| Angular CLI| 17.3    |

### Bibliothèques principales

| Bibliothèque | Rôle |
|---|---|
| `@angular/material` 17.3 | Composants UI Material Design (dialogs, inputs, menus, tables) |
| `@angular/cdk` 17.3 | Primitives Angular (overlay, drag & drop, portals) |
| `@fullcalendar/angular` 6.1 | Calendrier interactif (vues mois / semaine / jour / liste) |
| `chart.js` + `ng2-charts` | Graphiques analytics (barres, courbes, heatmap hebdomadaire) |
| `socket.io-client` 4.8 | Client WebSocket pour le chat et les sessions en temps réel |
| `date-fns` 3.6 | Manipulation des dates (formatage, calculs de semaine, locale FR) |
| `tailwindcss` 3.4 | Framework CSS utilitaire (responsive, dark mode via classe `.dark`) |
| `rxjs` 7.8 | Programmation réactive (Observables, opérateurs `switchMap`, `tap`, `catchError`) |

### Pattern architectural frontend

Le frontend suit une architecture **feature-based** modulaire :

- **`core/`** — Services singleton injectés globalement, modèles TypeScript, intercepteurs HTTP, guards de routes, validateurs de formulaires
- **`features/`** — Modules fonctionnels isolés, chacun avec ses pages et composants propres
- **`layout/`** — Shell de l'application, header, sidebar responsive
- **`shared/`** — Composants et pipes réutilisables (barre de session active, toast, etc.)

### Gestion d'état — Angular Signals

L'état est géré via les **Signals Angular 17** (`signal<T>()`, `computed()`, `effect()`). Il n'existe pas de store externe (NgRx) : chaque service expose des signaux en lecture seule (`asReadonly()`), garantissant un flux unidirectionnel et des mises à jour réactives sans abonnement manuel.

### Routing et sécurité des routes

Routing Angular avec **Lazy Loading** par feature. Les routes protégées sont gardées par :
- `AuthGuard` — vérifie que l'utilisateur est connecté
- `AdminGuard` — vérifie que l'utilisateur a le rôle `admin`

### Formulaires réactifs

Formulaires Angular (`ReactiveFormsModule`) avec validateurs personnalisés :
- `emailValidator` — format RFC 5322
- `passwordStrengthValidator` — longueur ≥ 8, majuscule, chiffre, caractère spécial (inscription uniquement)

---

## 6. Base de données

### Système

**MongoDB** (NoSQL orienté documents) — version 6.x recommandée.

- Base de données : `syncstudy`
- Accès via Spring Data MongoDB (repositories déclaratifs, aucun SQL)
- Schéma flexible : les documents évoluent sans migration destructive

### Collections principales

| Collection              | Modèle               | Description |
|-------------------------|----------------------|-------------|
| `users`                 | `User`               | Comptes utilisateurs (nom, email, rôle, école, préférences d'étude) |
| `subjects`              | `Subject`            | Matières et projets (`studyType`: `course` / `project`), priorité, objectif hebdo |
| `study_sessions`        | `StudySession`       | Sessions planifiées, en cours ou terminées (avec timer, notes, flashcards) |
| `availabilities`        | `Availability`       | Créneaux de disponibilité hebdomadaires par utilisateur |
| `study_groups`          | `StudyGroup`         | Groupes de travail (membres, code d'invitation, tâches partagées) |
| `group_messages`        | `GroupMessage`       | Messages de chat de groupe (fallback HTTP si Socket.IO indisponible) |
| `notifications`         | `Notification`       | Notifications in-app par utilisateur (avec statut `read`) |
| `password_reset_tokens` | `PasswordResetToken` | Tokens temporaires de réinitialisation (TTL géré applicativement) |

---

## 7. Temps réel — Socket.IO

Le serveur Socket.IO (`netty-socketio`, port 9092) est embarqué dans l'application Spring Boot mais écoute sur un port distinct.

### Événements gérés

| Événement               | Direction          | Usage |
|-------------------------|--------------------|-------|
| `joinGroup`             | Client → Serveur   | Rejoindre la room de chat d'un groupe |
| `leaveGroup`            | Client → Serveur   | Quitter une room |
| `sendMessage`           | Client → Serveur   | Envoyer un message dans le chat |
| `messageHistory`        | Serveur → Client   | Historique des messages à la connexion |
| `receiveMessage`        | Serveur → Client   | Diffusion d'un nouveau message en temps réel |
| `presenceUpdate`        | Serveur → Client   | Mise à jour des membres en ligne dans le groupe |
| `newSharedSession`      | Serveur → Client   | Nouvelle session de groupe partagée avec les membres |
| `sharedSessionModified` | Serveur → Client   | Modification d'une session de groupe existante |

Le frontend dispose d'un **fallback HTTP polling** (toutes les 3 secondes) si le serveur socket est indisponible ou si la connexion échoue.

---

## 8. Sécurité

### Authentification — JWT dual-token

| Token         | Stockage | Durée | Transport |
|---|---|---|---|
| **Access Token** | Mémoire JavaScript uniquement (variable privée, perdu au rechargement) | 15 minutes | Header `Authorization: Bearer <token>` |
| **Refresh Token** | Cookie `HttpOnly; SameSite=Lax; Path=/api/auth` (inaccessible au JavaScript) | 7 jours | Envoyé automatiquement par le navigateur |

Cette stratégie protège contre le vol de tokens par **XSS** : le refresh token n'est jamais accessible au code JavaScript de la page.

### Rotation automatique des tokens

L'intercepteur Angular (`AuthInterceptor`) intercepte toute réponse HTTP `401` et déclenche automatiquement un appel `POST /api/auth/refresh` (via le cookie HttpOnly). Si le refresh réussit, la requête initiale est relancée avec le nouveau token. Si le refresh échoue (cookie expiré ou absent), l'utilisateur est automatiquement déconnecté.

### Hachage des mots de passe

Les mots de passe sont hachés avec **BCrypt** (`BCryptPasswordEncoder`, coût par défaut = 10 rounds). Aucun mot de passe en clair n'est jamais stocké ni journalisé.

### Autorisation par rôle

- **Spring Security 6** avec `@EnableMethodSecurity`
- `@PreAuthorize("isAuthenticated()")` — toutes les routes protégées
- `@PreAuthorize("hasRole('ADMIN')")` — espace d'administration uniquement
- Le rôle est extrait du claim `role` du JWT et converti en autorité Spring (`ROLE_ADMIN` / `ROLE_STUDENT`)
- `AuthenticationEntryPoint` personnalisé → retourne **HTTP 401** (et non 403) pour les requêtes sans token valide, permettant au frontend de déclencher le refresh automatique

### Rate Limiting

Un `RateLimiterService` personnalisé (algorithme de fenêtre glissante, `ConcurrentHashMap`) limite les appels sur les endpoints sensibles :

| Endpoint                    | Limite                  |
|-----------------------------|-------------------------|
| `POST /auth/login`          | 10 tentatives / minute  |
| `POST /auth/register`       | 5 inscriptions / minute |
| `POST /auth/forgot-password`| 3 requêtes / minute     |

L'IP cliente est extraite depuis l'en-tête `X-Forwarded-For` (compatible déploiement derrière reverse proxy).

### CORS

La politique CORS (`CorsConfig`) autorise uniquement les origines configurées (variable `CORS_ORIGINS`, par défaut `http://localhost:4200`). Les en-têtes autorisés sont restreints aux seuls nécessaires : `Authorization`, `Content-Type`, `Accept`, `X-Requested-With`, `Cache-Control`.

### Contraintes de mot de passe (à l'inscription)

- Longueur minimale : 8 caractères
- Au moins une lettre majuscule
- Au moins un chiffre
- Au moins un caractère spécial parmi `!@#$%^&*()_+-=[]{}...`

Ces contraintes sont appliquées **uniquement à l'inscription** (pas à la connexion), permettant aux comptes existants de se connecter sans blocage.

### Secret JWT

En production, le secret JWT **doit** être défini via la variable d'environnement `JWT_SECRET` (chaîne aléatoire d'au moins 32 caractères, générée par exemple avec `openssl rand -base64 32`). Une valeur par défaut est fournie pour le démarrage local uniquement et **ne doit pas être utilisée en production**.

---

## 9. Algorithme de planification — détail complet

L'algorithme est implémenté dans `PlanningAlgorithmService` (backend Spring Boot). Il génère un planning hebdomadaire optimisé pour l'utilisateur selon une stratégie **Greedy** (gloutonne), c'est-à-dire qu'à chaque étape il place la meilleure session possible sans revenir en arrière.

---

### 9.1 Vue d'ensemble du processus

```
ENTRÉES
  ├── Matières de l'utilisateur (cours + projets)
  │     └── Pour chaque matière : priorité, objectif hebdo, durée min/max de session
  ├── Créneaux de disponibilité (jours + heures)
  ├── Sessions existantes confirmées (contraintes dures)
  └── Jours de repos à exclure

          │
          ▼
ÉTAPE 0 — Nettoyage
  Suppression des sessions auto-générées non complétées
  (repartir d'un planning vierge à chaque regénération)

          │
          ▼
ÉTAPE 1 — Calcul des heures déjà accomplies
  Pour chaque matière : sommer les sessions "completed" de la semaine courante
  → Déduire du quota hebdomadaire restant

          │
          ▼
ÉTAPE 2 — Tri et ordonnancement des matières
  Cours (course) triés par priorité décroissante  → traités en PREMIER
  Projets (project) triés par priorité décroissante → traités ensuite
  Ordre final : [Cours Haute] → [Cours Moyenne] → [Cours Basse]
             → [Projets Haute] → [Projets Moyenne] → [Projets Basse]

          │
          ▼
ÉTAPE 3 — Construction des fenêtres de disponibilité (DayWindows)
  Pour chaque jour de disponibilité de la semaine :
  ├── Exclure les jours de repos demandés
  ├── Si le jour est passé → reporter au même jour la semaine prochaine
  ├── Si c'est aujourd'hui → avancer le curseur à l'heure actuelle + 5 min
  ├── Détecter les chevauchements entre créneaux → lever AvailabilityOverlapException
  └── Trier les fenêtres par ordre chronologique

          │
          ▼
ÉTAPE 4 — Placement Greedy (boucle principale)
  Pour chaque matière dans l'ordre de priorité :
  └── Passes multiples (tant qu'il reste des heures ET que des progrès sont faits) :
      └── Pour chaque jour disponible :
          └── Pour chaque créneau du jour :
              ├── Avancer le curseur pour dépasser les sessions existantes
              ├── Calculer la durée disponible dans le créneau
              ├── Calculer la durée de session = min(heuresRestantes, maxSession, créneauDispo)
              ├── Vérifier le non-chevauchement final
              ├── Si OK → créer la session, avancer le curseur (fin session + 30 min de pause)
              └── Règle : 1 session max par matière par jour par passe

          │
          ▼
ÉTAPE 5 — Persistance
  sessionRepository.saveAll(generated) → toutes les sessions en MongoDB

          │
          ▼
ÉTAPE 6 — Rapport de sous-objectif (Shortfalls)
  Pour chaque matière avec des heures non planifiées :
  └── Retourner : heures manquantes, heures disponibles totales, flag "needsMoreAvailability"

SORTIES
  ├── Liste des sessions générées et sauvegardées
  └── Liste des shortfalls (matières partiellement ou non couvertes)
```

---

### 9.2 Règles détaillées

#### Règle 1 — Priorité hiérarchique et ordre de traitement

Les matières sont classées selon deux critères imbriqués :

1. **Type** : les cours (`studyType = course`) sont toujours traités avant les projets (`studyType = project`). Cela garantit que les cours obligatoires occupent les meilleurs créneaux.
2. **Priorité** : au sein de chaque type, l'ordre est `Haute (3) > Moyenne (2) > Basse (1)`.

Ce tri est statique : une fois l'ordre établi, chaque matière est traitée jusqu'à épuisement de son quota avant de passer à la suivante.

#### Règle 2 — Non-chevauchement strict

L'algorithme maintient deux listes de contraintes :
- `existing` : sessions déjà confirmées en base (manuelles ou complétées), futures uniquement
- `generated` : sessions créées dans la passe courante

Avant tout placement, deux vérifications sont effectuées :
1. **Avancement du curseur** (`advancePastOverlaps`) : le curseur de créneau est automatiquement avancé jusqu'à la fin d'une session existante + 30 minutes si une collision est détectée.
2. **Vérification finale** (`overlaps`) : contrôle d'intersection `[start, end[` avec les deux listes. Si chevauchement → le curseur avance de 30 min et on réessaie.

#### Règle 3 — Respect des durées min/max avec fractionnement

Pour chaque matière :
- `minSessionMin` (défaut : 45 min) — durée minimale d'une session. En dessous, le créneau est ignoré.
- `maxSessionMin` (défaut : 120 min) — durée maximale d'une session. Si l'objectif restant est supérieur, la session est créée à `maxSessionMin` et les heures restantes seront placées lors d'une passe suivante.

La durée effective est calculée ainsi :
```
durée = min(heuresRestantes, maxSession, tempsDisponibleDansLeCréneau)
```
Si `durée < minSession` → le créneau est ignoré et on passe au suivant.

#### Règle 4 — Répartition équilibrée sur la semaine

Pour éviter de concentrer toutes les sessions d'une matière sur un seul jour :
- La boucle principale effectue des **passes multiples** sur tous les jours disponibles.
- À chaque passe, une matière ne peut être placée qu'**une seule fois par jour** (`placedToday = true` dès le premier placement).
- Une passe s'arrête si aucun progrès n'a été réalisé (`progress = false`), évitant une boucle infinie.

Exemple : pour 6 heures de Mathématiques avec `maxSession = 2h`, l'algorithme répartit 3 sessions sur 3 jours différents, plutôt que 3 sessions consécutives le même jour.

#### Règle 5 — Déduction des heures déjà accomplies

Avant de calculer le quota à planifier, l'algorithme soustrait les heures déjà enregistrées en `completed` cette semaine :

```
hoursLeft = max(0, weeklyGoalHours - completedHoursThisWeek)
```

Si `hoursLeft = 0`, la matière est marquée comme entièrement couverte et aucune session n'est générée.

#### Règle 6 — Pause obligatoire entre sessions

Après chaque session placée, le curseur avance de `durée_session + 30 minutes`. Cette pause garantit un temps de repos entre deux sessions consécutives dans le même créneau de disponibilité.

---

### 9.3 Gestion des chevauchements de disponibilités

Si deux créneaux d'un même jour se chevauchent (ex : 9h–12h et 11h–14h), l'algorithme lève une `AvailabilityOverlapException` avant même de commencer le placement.

Le backend retourne alors `HTTP 409 Conflict` avec le détail du chevauchement. Le frontend propose deux choix :
- **Annuler** : l'utilisateur corrige manuellement ses disponibilités.
- **Fusionner automatiquement** (`mergeDuplicates: true`) : l'algorithme `mergeOverlappingAvailabilities` fusionne les créneaux qui se chevauchent sur chaque jour, sauvegarde les nouvelles disponibilités en base, puis relance la génération normalement.

**Exemple de fusion :**
```
Avant : [09:00–12:00] et [11:00–14:00]
Après  : [09:00–14:00]  (union des deux intervalles)
```

---

### 9.4 Construction des fenêtres de disponibilité

La méthode `buildDayWindows` convertit les disponibilités abstraites (jour de semaine + heures) en dates concrètes pour la semaine courante :

- **Semaine courante** : calculée à partir du lundi ISO (convention France, `WeekFields.of(Locale.FRANCE)`).
- **Jours passés** : si un jour de disponibilité est déjà passé dans la semaine courante, la fenêtre est reportée au même jour la semaine suivante, garantissant que le planning généré est toujours dans le futur.
- **Jour actuel** : si c'est aujourd'hui, le curseur de début est avancé à `maintenant + 5 minutes` pour ne pas générer de session déjà commencée.
- **Tri final** : les fenêtres sont triées par ordre chronologique pour un placement naturel du lundi au dimanche.

---

### 9.5 Rapport de sous-objectif (Shortfalls)

À l'issue du placement, l'algorithme calcule pour chaque matière les heures non planifiées et construit un rapport enrichi :

| Champ | Description |
|---|---|
| `subjectName` | Nom de la matière concernée |
| `hoursMissing` | Heures non planifiables cette semaine |
| `hoursNeeded` | Quota restant après déduction des heures complétées |
| `totalAvailableHours` | Total des heures de disponibilité de la semaine |
| `needsMoreAvailability` | `true` si les disponibilités totales sont insuffisantes pour couvrir tous les objectifs |
| `studyType` | `course` ou `project` |

Ce rapport est affiché à l'utilisateur après génération pour lui permettre d'ajuster soit ses objectifs, soit ses créneaux de disponibilité.

---

### 9.6 Nettoyage avant regénération

À chaque appel à `generateSchedule`, toutes les sessions `autoGenerated = true` avec un statut différent de `completed` sont **supprimées de la base**. Cela garantit que le planning reflète toujours l'état actuel des matières et des disponibilités, sans accumulation de sessions obsolètes. Les sessions manuelles et les sessions complétées sont préservées.

---

## 10. Structure des répertoires

```
syncstudy/
├── backend/                               # Application Spring Boot
│   └── src/main/java/com/syncstudy/
│       ├── config/                        # CORS, JWT, Socket.IO, DataInitializer
│       ├── controller/                    # 8 contrôleurs REST
│       ├── dto/                           # DTOs requête et réponse
│       ├── model/                         # 10 entités MongoDB (@Document)
│       ├── repository/                    # Interfaces Spring Data MongoDB
│       ├── security/                      # JwtAuthFilter, RateLimiterService, UserDetailsServiceImpl
│       └── service/                       # Logique métier, PlanningAlgorithmService, MailService
│
├── frontend/                              # Application Angular 17
│   └── src/app/
│       ├── core/
│       │   ├── api/                       # API_PATHS (constantes d'endpoints centralisées)
│       │   ├── interceptors/              # AuthInterceptor (JWT + refresh automatique)
│       │   ├── guards/                    # AuthGuard, AdminGuard
│       │   ├── models/                    # Interfaces TypeScript (User, Subject, Session...)
│       │   ├── services/                  # AuthService, PlanningService, CollaborationService...
│       │   └── validators/                # emailValidator, passwordStrengthValidator
│       ├── features/
│       │   ├── auth/                      # Connexion, inscription, onboarding, mot de passe oublié
│       │   ├── planning/                  # Tableau de bord, calendrier FullCalendar
│       │   ├── subjects/                  # Gestion des matières (cours)
│       │   ├── projects/                  # Gestion des projets
│       │   ├── sessions/                  # Sessions actives, historique, détail
│       │   ├── groups/                    # Groupes de travail, chat temps réel
│       │   ├── analytics/                 # Graphiques Chart.js, heatmap, statistiques
│       │   ├── admin/                     # Interface d'administration des utilisateurs
│       │   └── settings/                  # Préférences, profil, disponibilités
│       ├── layout/                        # Shell, header, sidebar responsive
│       └── shared/                        # Composants réutilisables (toast, session-bar)
│
└── README.md                              # Ce fichier
```

---

## 11. Variables d'environnement

| Variable        | Obligatoire en prod | Valeur par défaut (dev)              | Description |
|---|---|---|---|
| `JWT_SECRET`    | ✅ Oui              | `syncstudy-dev-secret-...`           | Secret HMAC-SHA256 pour signer les JWT (minimum 32 caractères) |
| `MONGODB_URI`   | Recommandé          | `mongodb://localhost:27017/syncstudy`| URI de connexion MongoDB |
| `CORS_ORIGINS`  | Recommandé          | `http://localhost:4200`              | Origines CORS autorisées |
| `MAIL_HOST`     | Pour les e-mails    | `smtp.gmail.com`                     | Serveur SMTP |
| `MAIL_USERNAME` | Pour les e-mails    | *(vide)*                             | Adresse e-mail d'envoi |
| `MAIL_PASSWORD` | Pour les e-mails    | *(vide)*                             | Mot de passe SMTP / App Password |

---

## 12. Lancer le projet en local

### Prérequis

- Java 21+
- Maven 3.8+
- Node.js 18+ et npm
- MongoDB en cours d'exécution sur `localhost:27017`

### Backend

```bash
cd backend

# Optionnel : définir le secret JWT pour l'environnement local
export JWT_SECRET="mon-secret-local-au-moins-32-caracteres"

mvn spring-boot:run
# API disponible sur http://localhost:8080/api
# Socket.IO sur       http://localhost:9092
```

### Frontend

```bash
cd frontend
npm install
npm start
# Application disponible sur http://localhost:4200
```

Le proxy de développement (`proxy.conf.json`) redirige automatiquement :
- `/api/*` → `http://localhost:8080`
- `/socket.io/*` → `http://localhost:9092`

### Tests frontend

```bash
cd frontend
npm test
# Lance Karma + Jasmine
# Suites couvertes : AuthService, NotificationService, AnalyticsService, ToastService, AdminService
```

---

*Documentation technique du projet SyncStudy.*

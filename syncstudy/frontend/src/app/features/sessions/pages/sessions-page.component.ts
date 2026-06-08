import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PlanningService } from '../../../core/services/planning.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { CollaborationService } from '../../../core/services/collaboration.service';
import { SessionConflictService } from '../../../core/services/session-conflict.service';
import { StudySession } from '../../../core/models/session.model';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type SessionTypeFilter = '' | 'cours_perso' | 'cours_groupe' | 'projet_perso' | 'projet_groupe';

@Component({
  selector: 'app-sessions-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-8 fade-in">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-black text-slate-900 dark:text-white">Sessions</h1>
          <p class="text-slate-500 dark:text-slate-400 mt-1">Consultez et gérez toutes vos sessions d'étude.</p>
        </div>
        <div class="flex items-center gap-3">
          <button (click)="openAddSessionModal()"
                  class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 
                         text-slate-900 dark:text-white px-6 py-3 rounded-2xl font-bold
                         hover:bg-slate-50 dark:hover:bg-slate-800 transition-all 
                         flex items-center gap-2 shadow-sm">
            <span class="material-icons text-lg">add</span>
            Nouvelle Session
          </button>
        </div>
      </div>

      <!-- Sessions card -->
      <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 
                  shadow-sm overflow-hidden">
        
        <!-- Filters toolbar -->
        <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-700 
                    bg-slate-50 dark:bg-slate-800 rounded-t-3xl space-y-4">
          
          <!-- Top row: title + search -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h3 class="font-bold text-slate-900 dark:text-white">
              Toutes les sessions ({{ filteredSessions().length }})
            </h3>
            <div class="relative w-full sm:w-72">
              <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-base">search</span>
              <input type="text" 
                     [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)"
                     placeholder="Rechercher une session..."
                     class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 
                            rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300
                            focus:ring-2 focus:ring-indigo-500 outline-none transition-all
                            placeholder-slate-400 dark:placeholder-slate-500" />
            </div>
          </div>

          <!-- Bottom row: filter chips -->
          <div class="flex flex-wrap items-center gap-3">
            <!-- Subject filter -->
            <select [ngModel]="subjectFilter()" (ngModelChange)="subjectFilter.set($event)"
                    class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 
                           rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300
                           focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
              <option value="">Toutes les matières</option>
              @for (s of planning.subjects(); track s.id) {
                <option [value]="s.id">{{ s.name }}</option>
              }
            </select>

            <!-- Session type filter -->
            <div class="flex flex-wrap gap-2">
              <button (click)="sessionTypeFilter.set('')"
                      [class]="sessionTypeFilter() === '' 
                        ? 'px-4 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white shadow-sm transition-all'
                        : 'px-4 py-2 rounded-xl text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all'">
                Tout
              </button>
              <button (click)="sessionTypeFilter.set('cours_perso')"
                      [class]="sessionTypeFilter() === 'cours_perso' 
                        ? 'px-4 py-2 rounded-xl text-sm font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-2 border-indigo-400 dark:border-indigo-600 shadow-sm transition-all'
                        : 'px-4 py-2 rounded-xl text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all'">
                <span class="inline-flex items-center gap-1.5">
                  <span class="material-icons text-sm">menu_book</span>
                  Cours Personnel
                </span>
              </button>
              <button (click)="sessionTypeFilter.set('cours_groupe')"
                      [class]="sessionTypeFilter() === 'cours_groupe' 
                        ? 'px-4 py-2 rounded-xl text-sm font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-2 border-blue-400 dark:border-blue-600 shadow-sm transition-all'
                        : 'px-4 py-2 rounded-xl text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all'">
                <span class="inline-flex items-center gap-1.5">
                  <span class="material-icons text-sm">groups</span>
                  Cours en Groupe
                </span>
              </button>
              <button (click)="sessionTypeFilter.set('projet_perso')"
                      [class]="sessionTypeFilter() === 'projet_perso' 
                        ? 'px-4 py-2 rounded-xl text-sm font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-2 border-amber-400 dark:border-amber-600 shadow-sm transition-all'
                        : 'px-4 py-2 rounded-xl text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all'">
                <span class="inline-flex items-center gap-1.5">
                  <span class="material-icons text-sm">build</span>
                  Projet Personnel
                </span>
              </button>
              <button (click)="sessionTypeFilter.set('projet_groupe')"
                      [class]="sessionTypeFilter() === 'projet_groupe' 
                        ? 'px-4 py-2 rounded-xl text-sm font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-400 dark:border-emerald-600 shadow-sm transition-all'
                        : 'px-4 py-2 rounded-xl text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all'">
                <span class="inline-flex items-center gap-1.5">
                  <span class="material-icons text-sm">group_work</span>
                  Projet en Groupe
                </span>
              </button>
            </div>
          </div>
        </div>

        <!-- Sessions non planifiées (aucune disponibilité commune) -->
        @if (unscheduledGroupSessions().length > 0) {
          <div class="px-6 py-4 border-b border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
            <div class="flex items-center gap-2 mb-3">
              <span class="material-icons text-amber-500 text-lg">event_busy</span>
              <p class="text-sm font-bold text-amber-700 dark:text-amber-400">
                Sessions en attente de planification ({{ unscheduledGroupSessions().length }})
              </p>
            </div>
            @for (session of unscheduledGroupSessions(); track session.id) {
              <div class="flex items-center justify-between py-3 border-b border-amber-100 dark:border-amber-900 last:border-0">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-100 dark:bg-amber-900">
                    <span class="material-icons text-base text-amber-600 dark:text-amber-400">group</span>
                  </div>
                  <div>
                    <p class="text-sm font-bold text-slate-800 dark:text-white">
                      {{ subjectName(session.subjectId, session.title) }}
                    </p>
                    <p class="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                      {{ formatDate(session.startTime) }} · {{ formatTime(session.startTime) }} — {{ formatTime(session.endTime) }}
                      · Aucune disponibilité commune — à reprogrammer
                    </p>
                  </div>
                </div>
                <button (click)="deleteSession(session.id)"
                        class="p-2 rounded-xl text-amber-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition-all"
                        title="Supprimer">
                  <span class="material-icons text-lg">delete</span>
                </button>
              </div>
            }
          </div>
        }

        <!-- Session list -->
        <div class="divide-y divide-slate-100 dark:divide-slate-700">
          @for (session of filteredSessions(); track session.id) {
            <div [class]="session.isGroupSession
                  ? 'px-6 py-6 flex items-center justify-between transition-all group border-l-4 border-indigo-400 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40'
                  : 'px-6 py-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-all group'">
              
              <!-- Left: icon + info -->
              <div class="flex items-center gap-5 flex-1 min-w-0">
                <div class="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                     [style.background]="subjectColor(session.subjectId) + '18'">
                  <span class="material-icons text-2xl" [style.color]="subjectColor(session.subjectId)">
                    {{ getSessionIcon(session) }}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1 flex-wrap">
                    <p class="font-bold text-slate-900 dark:text-white text-lg truncate">
                      {{ subjectName(session.subjectId, session.title) }}
                    </p>
                    <!-- Type badge -->
                    <span [class]="getSessionTypeBadgeClass(session)">
                      {{ getSessionTypeLabel(session) }}
                    </span>
                    @if (session.isGroupSession) {
                      <span class="bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400
                                   text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider">
                        Groupe
                      </span>
                    }
                    <!-- Status badge -->
                    <span [class]="getStatusBadgeClass(session)">
                      <span class="material-icons" style="font-size:10px; vertical-align:middle;">{{ getStatusIcon(session) }}</span>
                      {{ getStatusLabel(session) }}
                    </span>
                  </div>
                  <div class="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 flex-wrap">
                    <div class="flex items-center gap-1.5">
                      <span class="material-icons text-sm">calendar_today</span>
                      {{ formatDate(session.startTime) }}
                    </div>
                    <div class="flex items-center gap-1.5">
                      <span class="material-icons text-sm">schedule</span>
                      {{ formatTime(session.startTime) }} — {{ formatTime(session.endTime) }}
                    </div>
                    @if (session.isGroupSession && session.groupId) {
                      <div class="flex items-center gap-1.5 text-indigo-500 dark:text-indigo-400 font-semibold">
                        <span class="material-icons text-sm">group</span>
                        {{ groupName(session.groupId) }}
                      </div>
                    }
                  </div>
                  @if (session.objectives?.length) {
                    <div class="mt-3 flex flex-wrap gap-1.5">
                      @for (obj of session.objectives!.slice(0, 2); track obj) {
                        <span class="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 
                                     text-slate-500 dark:text-slate-400 px-3 py-1 rounded-xl border 
                                     border-slate-200 dark:border-slate-700">
                          {{ obj }}
                        </span>
                      }
                      @if (session.objectives!.length > 2) {
                        <span class="text-[10px] font-medium text-slate-400 dark:text-slate-500 self-center">
                          +{{ session.objectives!.length - 2 }}
                        </span>
                      }
                    </div>
                  }
                </div>
              </div>

              <!-- Right: status + actions -->
              <div class="flex items-center gap-3 flex-shrink-0">
                @if (session.isCompleted) {
                  <button (click)="viewSessionDetails(session.id)"
                          class="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm
                                 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400
                                 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-all">
                    <span class="material-icons text-base">check_circle</span>
                    Terminée · Voir détails
                  </button>
                } @else if (isExpired(session)) {
                  <span class="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm
                               bg-slate-100 dark:bg-slate-800 text-slate-400">
                    <span class="material-icons text-base">error_outline</span>
                    Expirée
                  </span>
                } @else {
                  <button (click)="startSession(session.id)"
                          [class]="planning.activeId() === session.id 
                            ? 'flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                            : 'flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold bg-slate-900 dark:bg-white dark:text-slate-900 text-white hover:bg-slate-800 dark:hover:bg-slate-100 transition-all'">
                    <span class="material-icons text-base">play_arrow</span>
                    {{ planning.activeId() === session.id ? 'En cours...' : isPausedSession(session) ? 'Reprendre' : 'Démarrer' }}
                  </button>
                }

                <!-- Partager avec un groupe : visible pour tous les types, désactivé si expirée -->
                @if (collab.groups().length > 0) {
                  @if (isExpired(session) && !session.isCompleted) {
                    <span class="p-3 rounded-2xl text-slate-200 dark:text-slate-700 cursor-not-allowed relative group/share"
                          title="Session expirée — partage impossible">
                      <span class="material-icons text-xl">group_add</span>
                      <!-- Tooltip -->
                      <span class="absolute bottom-full right-0 mb-2 hidden group-hover/share:flex items-center gap-1
                                   bg-slate-800 dark:bg-slate-700 text-white text-[11px] font-semibold
                                   px-3 py-1.5 rounded-xl whitespace-nowrap shadow-lg z-10 pointer-events-none">
                        <span class="material-icons text-xs">block</span>
                        Session expirée · partage impossible
                      </span>
                    </span>
                  } @else {
                    <button (click)="openShareModal(session)"
                            class="p-3 rounded-2xl text-slate-400 dark:text-slate-500
                                   hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-all"
                            title="Partager avec un groupe">
                      <span class="material-icons text-xl">group_add</span>
                    </button>
                  }
                }

                <!-- Voir détails du groupe : uniquement pour les sessions de groupe -->
                @if (session.isGroupSession) {
                  <button (click)="openGroupSessionDetail(session)"
                          class="p-3 rounded-2xl text-slate-400 dark:text-slate-500
                                 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-all"
                          title="Informations du groupe">
                    <span class="material-icons text-xl">info_outline</span>
                  </button>
                }

                <button (click)="deleteSession(session.id)"
                        class="p-3 rounded-2xl text-slate-300 dark:text-slate-600 
                               hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition-all"
                        title="Supprimer">
                  <span class="material-icons text-xl">delete</span>
                </button>
              </div>
            </div>
          } @empty {
            <div class="py-24 text-center">
              <div class="w-24 h-24 mx-auto mb-6 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center">
                <span class="material-icons text-6xl text-slate-200 dark:text-slate-700">schedule</span>
              </div>
              <h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-3">Aucune session trouvée</h3>
              <p class="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8">
                @if (searchQuery() || subjectFilter() || sessionTypeFilter()) {
                  Aucune session ne correspond à vos filtres. Essayez de modifier vos critères de recherche.
                } @else {
                  Vous n'avez pas encore de sessions. Commencez par générer votre planning.
                }
              </p>
              @if (searchQuery() || subjectFilter() || sessionTypeFilter()) {
                <button (click)="clearFilters()"
                        class="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-8 py-3.5 rounded-2xl font-bold
                               hover:bg-slate-800 dark:hover:bg-slate-100 transition-all">
                  Réinitialiser les filtres
                </button>
              } @else {
                <button (click)="regenerate()"
                        class="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-bold
                               hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                  Aller au Planning
                </button>
              }
            </div>
          }
        </div>
      </div>
    </div>

    <!-- Add session modal -->
    @if (showAddModal()) {
      <div class="fixed inset-0 bg-slate-900/70 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center fade-in"
           (click)="showAddModal.set(false)">
        <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 w-full max-w-md mx-4 border border-slate-200 dark:border-slate-700"
             (click)="$event.stopPropagation()">
          <h3 class="text-2xl font-black text-slate-900 dark:text-white mb-1">Nouvelle Session</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Créez une session d'étude.</p>
          
          <form (ngSubmit)="addSession()" class="space-y-5">
            <div>
              <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Portée de la session</label>
              <div class="flex gap-3">
                <button type="button" (click)="setNewSessionScope('course')"
                        [class]="newSessionScope() === 'course'
                          ? 'flex-1 py-3 rounded-2xl border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-sm flex items-center justify-center gap-2'
                          : 'flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition'">
                  <span class="material-icons text-base">menu_book</span> Cours
                </button>
                <button type="button" (click)="setNewSessionScope('project')"
                        [class]="newSessionScope() === 'project'
                          ? 'flex-1 py-3 rounded-2xl border-2 border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-sm flex items-center justify-center gap-2'
                          : 'flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition'">
                  <span class="material-icons text-base">build</span> Projet
                </button>
              </div>
            </div>
            <div>
              <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                {{ newSessionScope() === 'project' ? 'Projet' : 'Cours / matière' }}
              </label>
              <select [(ngModel)]="newSession.subjectId" name="sessionSubjectId"
                      (ngModelChange)="onNewSessionSubjectChange($event)"
                      class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                             rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500
                             dark:text-white transition-all">
                <option value="" disabled>
                  {{ newSessionScope() === 'project' ? 'Sélectionner un projet' : 'Sélectionner un cours' }}
                </option>
                @for (s of subjectsForNewSession(); track s.id) {
                  <option [value]="s.id">{{ s.name }}</option>
                }
              </select>
              @if (!subjectsForNewSession().length) {
                <p class="mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                  {{ newSessionScope() === 'project'
                    ? 'Aucun projet enregistré. Ajoutez-en depuis la page Projets.'
                    : 'Aucun cours enregistré. Ajoutez-en depuis la page Matières.' }}
                </p>
              }
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Début</label>
                <input [(ngModel)]="newSession.startTime" name="sessionStart" type="datetime-local"
                       class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                              rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500
                              dark:text-white transition-all" />
              </div>
              <div>
                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Fin</label>
                <input [(ngModel)]="newSession.endTime" name="sessionEnd" type="datetime-local"
                       class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                              rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500
                              dark:text-white transition-all" />
              </div>
            </div>

            <!-- Type de session -->
            <div>
              <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Type de session</label>
              <div class="flex gap-3">
                <button type="button" (click)="newSession.isGroupSession = false"
                        [class]="!newSession.isGroupSession
                          ? 'flex-1 py-3 rounded-2xl border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 font-bold text-sm flex items-center justify-center gap-2'
                          : 'flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition'">
                  <span class="material-icons text-base">lock</span> Privée
                </button>
                <button type="button" (click)="newSession.isGroupSession = true"
                        [class]="newSession.isGroupSession
                          ? 'flex-1 py-3 rounded-2xl border-2 border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-600 font-bold text-sm flex items-center justify-center gap-2'
                          : 'flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition'">
                  <span class="material-icons text-base">group</span> Groupe
                </button>
              </div>
            </div>
            <div class="flex justify-between items-center pt-4">
              <button type="button" (click)="showAddModal.set(false)"
                      class="text-slate-500 dark:text-slate-400 font-bold px-5 py-2 hover:text-slate-700 dark:hover:text-slate-200">
                Annuler
              </button>
              <button type="submit"
                      class="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-indigo-700 transition-all">
                Créer la session
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Share to group modal -->
    @if (showShareModal()) {
      <div class="fixed inset-0 bg-slate-900/70 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center fade-in"
           (click)="showShareModal.set(false)">
        <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 w-full max-w-md mx-4 border border-slate-200 dark:border-slate-700"
             (click)="$event.stopPropagation()">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
              <span class="material-icons text-indigo-600 dark:text-indigo-400">group_add</span>
            </div>
            <h3 class="text-2xl font-black text-slate-900 dark:text-white">Partager avec un groupe</h3>
          </div>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Cette session sera ajoutée dans la liste des sessions de tous les membres du groupe sélectionné.
          </p>

          @if (shareTargetSession()) {
            <div class="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 mb-5 flex items-center gap-3">
              <span class="material-icons text-indigo-500">schedule</span>
              <div>
                <p class="font-bold text-slate-900 dark:text-white text-sm">
                  {{ subjectName(shareTargetSession()!.subjectId, shareTargetSession()!.title) }}
                </p>
                <p class="text-xs text-slate-500 dark:text-slate-400">
                  {{ formatDate(shareTargetSession()!.startTime) }} · {{ formatTime(shareTargetSession()!.startTime) }} — {{ formatTime(shareTargetSession()!.endTime) }}
                </p>
              </div>
            </div>
          }

          <div class="space-y-3 mb-6">
            <label class="block text-sm font-bold text-slate-700 dark:text-slate-300">Choisir le groupe</label>
            @for (g of collab.groups(); track g.id) {
              <button (click)="selectedShareGroupId.set(g.id)"
                      [class]="selectedShareGroupId() === g.id
                        ? 'w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-sm transition-all'
                        : 'w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-sm transition-all'">
                <span class="material-icons text-base">groups</span>
                {{ g.name }}
              </button>
            }
          </div>

          <div class="flex justify-between items-center">
            <button (click)="showShareModal.set(false)"
                    class="text-slate-500 dark:text-slate-400 font-bold px-5 py-2 hover:text-slate-700 dark:hover:text-slate-200">
              Annuler
            </button>
            <button (click)="confirmShare()"
                    [disabled]="!selectedShareGroupId() || isSharing()"
                    class="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-indigo-700
                           disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2">
              @if (isSharing()) {
                <span class="material-icons text-sm animate-spin">refresh</span>
                Partage en cours...
              } @else {
                <span class="material-icons text-sm">share</span>
                Partager
              }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Invite modal -->
    @if (showInviteModal()) {
      <div class="fixed inset-0 bg-slate-900/70 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center fade-in"
           (click)="showInviteModal.set(false)">
        <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 w-full max-w-md mx-4 border border-slate-200 dark:border-slate-700"
             (click)="$event.stopPropagation()">
          <h3 class="text-2xl font-black text-slate-900 dark:text-white mb-1">Inviter des membres</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Partagez le lien d'invitation.</p>
          
          <div class="space-y-6">
            <div>
              <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Lien d'invitation</label>
              <div class="flex gap-2">
                <input type="text" readonly value="https://syncstudy.app/join/xyz123"
                       class="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 
                              rounded-2xl px-5 py-3.5 text-sm text-slate-500 dark:text-slate-400" />
                <button (click)="copyLink()"
                        class="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-6 rounded-2xl 
                               font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all">
                  Copier
                </button>
              </div>
            </div>
            <div>
              <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Inviter par email</label>
              <input [(ngModel)]="inviteEmail" type="email" placeholder="email@exemple.com"
                     class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 
                            rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 
                            dark:text-white transition-all" />
            </div>
            <button (click)="sendInvite()"
                    class="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all">
              Envoyer l'invitation
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Modal : détails de la session de groupe -->
    @if (showGroupDetailModal() && selectedGroupSession()) {
      <div class="fixed inset-0 bg-slate-900/70 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center fade-in"
           (click)="showGroupDetailModal.set(false)">
        <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg mx-4 border border-slate-200 dark:border-slate-700 overflow-hidden"
             (click)="$event.stopPropagation()">

          <!-- En-tête colorée avec le nom du groupe -->
          <div class="px-8 py-6 flex items-center justify-between"
               [style.background]="groupColorForSession(selectedGroupSession()!)">
            <div>
              <p class="text-xs font-black text-white/70 uppercase tracking-widest mb-1">Session de groupe</p>
              <h3 class="text-2xl font-black text-white">
                {{ subjectName(selectedGroupSession()!.subjectId, selectedGroupSession()!.title) }}
              </h3>
              @if (selectedGroupSession()!.groupId) {
                <p class="text-sm text-white/80 mt-1 font-semibold">
                  {{ groupName(selectedGroupSession()!.groupId!) }}
                </p>
              } @else {
                <span class="inline-flex items-center gap-1.5 mt-1 text-xs font-bold bg-white/20 px-3 py-1 rounded-full text-white/90">
                  <span class="material-icons text-xs">link_off</span>
                  Non partagée avec un groupe
                </span>
              }
            </div>
            <button (click)="showGroupDetailModal.set(false)"
                    class="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all">
              <span class="material-icons text-white text-lg">close</span>
            </button>
          </div>

          <!-- Corps du modal -->
          <div class="px-8 py-6 space-y-6">

            <!-- Date & heure -->
            <div class="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800">
              <div class="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                <span class="material-icons text-indigo-600 dark:text-indigo-400 text-lg">event</span>
              </div>
              <div>
                <p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Date & Heure</p>
                <p class="text-sm font-bold text-slate-800 dark:text-white">
                  {{ formatDate(selectedGroupSession()!.startTime) }}
                  &nbsp;·&nbsp;
                  {{ formatTime(selectedGroupSession()!.startTime) }} — {{ formatTime(selectedGroupSession()!.endTime) }}
                </p>
              </div>
            </div>

            <!-- Créateur -->
            <div>
              <p class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Créée par</p>
              @if (creatorOfGroupSession(selectedGroupSession()!); as creator) {
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-black">
                    {{ creator.name.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <p class="text-sm font-bold text-slate-900 dark:text-white">{{ creator.name }}</p>
                    <p class="text-xs text-indigo-500 dark:text-indigo-400 font-semibold">Propriétaire</p>
                  </div>
                </div>
              }
            </div>

            <!-- Membres du groupe -->
            <div>
              @if (selectedGroupSession()!.groupId) {
                <p class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                  Membres ({{ membersOfGroupSession(selectedGroupSession()!).length }})
                </p>
                <div class="space-y-2">
                  @for (m of membersOfGroupSession(selectedGroupSession()!); track m.id) {
                    <div class="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                      <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black"
                           [style.background]="groupColorForSession(selectedGroupSession()!)">
                        {{ m.name.charAt(0).toUpperCase() }}
                      </div>
                      <div class="flex-1">
                        <p class="text-sm font-semibold text-slate-800 dark:text-white">{{ m.name }}</p>
                      </div>
                      <span [class]="m.role === 'Propriétaire'
                        ? 'text-[10px] font-black px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 uppercase tracking-wide'
                        : 'text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wide'">
                        {{ m.role }}
                      </span>
                    </div>
                  }
                </div>
              } @else {
                <!-- Session pas encore partagée → inviter à partager -->
                <div class="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800 flex items-start gap-3">
                  <span class="material-icons text-amber-500 mt-0.5 text-lg">group_off</span>
                  <div class="flex-1">
                    <p class="text-sm font-bold text-amber-700 dark:text-amber-400">Aucun groupe associé</p>
                    <p class="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                      Cette session n'a pas encore été partagée avec un groupe. Partagez-la pour inviter des membres.
                    </p>
                    <button (click)="showGroupDetailModal.set(false); openShareModal(selectedGroupSession()!)"
                            class="mt-3 inline-flex items-center gap-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600
                                   text-white px-4 py-2 rounded-xl transition-all">
                      <span class="material-icons text-xs">group_add</span>
                      Partager maintenant
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="px-8 pb-6">
            <button (click)="showGroupDetailModal.set(false)"
                    class="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200
                           py-3 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
              Fermer
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class SessionsPageComponent {
  planning  = inject(PlanningService);
  toast     = inject(ToastService);
  router    = inject(Router);
  auth      = inject(AuthService);
  collab    = inject(CollaborationService);
  conflicts = inject(SessionConflictService); // utilisé pour addSession ET confirmShare

  showAddModal         = signal(false);
  showInviteModal      = signal(false);
  showShareModal       = signal(false);
  showGroupDetailModal = signal(false);
  selectedGroupSession = signal<StudySession | null>(null);
  searchQuery     = signal('');
  subjectFilter   = signal('');
  sessionTypeFilter = signal<SessionTypeFilter>('');
  inviteEmail     = '';
  newSession = { subjectId: '', startTime: '', endTime: '', isGroupSession: false };
  /** Filtre du modal « Nouvelle session » : cours ou projet (aligné sur Subject.studyType). */
  newSessionScope = signal<'course' | 'project'>('course');

  // Share to group
  shareTargetSession  = signal<StudySession | null>(null);
  selectedShareGroupId = signal<string>('');
  isSharing           = signal(false);

  subjectsForNewSession = computed(() =>
    this.planning.subjects().filter((s) => (s.studyType ?? 'course') === this.newSessionScope())
  );

  /** Sessions de groupe non planifiées (aucune disponibilité commune trouvée) — affichées séparément */
  unscheduledGroupSessions = computed(() =>
    this.planning.sessions().filter(s => s.status === 'unscheduled')
  );

  filteredSessions = computed(() => {
    const subjectFilterVal = this.subjectFilter();
    const typeFilter = this.sessionTypeFilter();
    const query = this.searchQuery().toLowerCase().trim();

    let sessions = this.planning.sessions()
      .filter(s => s.status !== 'unscheduled') // exclure les non-planifiées (affichées à part)
      .slice()
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    // Filter by subject
    if (subjectFilterVal) {
      sessions = sessions.filter((s) => s.subjectId === subjectFilterVal);
    }

    // Filter by session type (combines studyType from subject + isGroupSession)
    if (typeFilter) {
      sessions = sessions.filter((s) => {
        const subject = this.planning.subjects().find(sub => sub.id === s.subjectId);
        const studyType = subject?.studyType ?? 'course';
        const isGroup = !!s.isGroupSession;

        switch (typeFilter) {
          case 'cours_perso':   return studyType === 'course'  && !isGroup;
          case 'cours_groupe':  return studyType === 'course'  && isGroup;
          case 'projet_perso':  return studyType === 'project' && !isGroup;
          case 'projet_groupe': return studyType === 'project' && isGroup;
          default: return true;
        }
      });
    }

    // Filter by search query (match subject name or objectives)
    if (query) {
      sessions = sessions.filter((s) => {
        const name = this.subjectName(s.subjectId, s.title).toLowerCase();
        const objectives = (s.objectives ?? []).join(' ').toLowerCase();
        return name.includes(query) || objectives.includes(query);
      });
    }

    return sessions;
  });

  subjectName(id: string, fallback?: string): string {
    return this.planning.subjects().find((s) => s.id === id)?.name ?? fallback ?? '—';
  }

  subjectColor(id: string): string {
    return this.planning.subjects().find((s) => s.id === id)?.color ?? '#6366f1';
  }

  getSubjectStudyType(subjectId: string): 'course' | 'project' {
    return this.planning.subjects().find(s => s.id === subjectId)?.studyType ?? 'course';
  }

  getSessionIcon(session: StudySession): string {
    const type = this.getSubjectStudyType(session.subjectId);
    if (session.isGroupSession) {
      return type === 'project' ? 'group_work' : 'groups';
    }
    return type === 'project' ? 'build' : 'menu_book';
  }

  getSessionTypeLabel(session: StudySession): string {
    const type = this.getSubjectStudyType(session.subjectId);
    if (type === 'project') return 'Projet';
    return 'Cours';
  }

  groupName(groupId: string | undefined): string {
    if (!groupId) return '';
    return this.collab.groups().find(g => g.id === groupId)?.name ?? 'Groupe';
  }

  openGroupSessionDetail(session: StudySession): void {
    this.selectedGroupSession.set(session);
    this.showGroupDetailModal.set(true);
  }

  /** Renvoie le créateur (propriétaire) du groupe auquel appartient la session.
   *  Si la session n'est pas encore partagée, retourne l'utilisateur courant. */
  creatorOfGroupSession(session: StudySession): { name: string } | null {
    const group = this.collab.groups().find(g => g.id === session.groupId);
    if (group) {
      const owner = group.memberDetails?.find(m => m.role === 'Propriétaire');
      return owner ?? null;
    }
    // Session non encore partagée → l'utilisateur courant est le créateur
    const currentUser = this.auth.currentUser();
    if (currentUser) return { name: currentUser.name };
    return null;
  }

  /** Renvoie tous les membres du groupe auquel appartient la session */
  membersOfGroupSession(session: StudySession): { id: string; name: string; role: string }[] {
    const group = this.collab.groups().find(g => g.id === session.groupId);
    return group?.memberDetails ?? [];
  }

  /** Renvoie la couleur de fond du groupe pour les éléments visuels */
  groupColorForSession(session: StudySession): string {
    const group = this.collab.groups().find(g => g.id === session.groupId);
    if (!group) return '#6366f1';
    // colorClass → extraire la couleur Tailwind vers une couleur CSS approximative
    const colorMap: Record<string, string> = {
      'bg-blue-500': '#3b82f6', 'bg-indigo-500': '#6366f1', 'bg-violet-500': '#8b5cf6',
      'bg-purple-500': '#a855f7', 'bg-pink-500': '#ec4899',  'bg-red-500': '#ef4444',
      'bg-orange-500': '#f97316','bg-amber-500': '#f59e0b',  'bg-yellow-500': '#eab308',
      'bg-lime-500': '#84cc16',  'bg-green-500': '#22c55e',  'bg-teal-500': '#14b8a6',
      'bg-cyan-500': '#06b6d4',  'bg-sky-500': '#0ea5e9',
    };
    return colorMap[group.colorClass] ?? '#6366f1';
  }

  getSessionTypeBadgeClass(session: StudySession): string {
    const type = this.getSubjectStudyType(session.subjectId);
    const base = 'text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider';
    if (type === 'project') {
      return `${base} bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400`;
    }
    return `${base} bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400`;
  }

  formatDate(d: Date): string { return format(d, 'dd MMMM yyyy', { locale: fr }); }
  formatTime(d: Date): string { return format(d, 'HH:mm'); }
  isExpired(s: StudySession): boolean { return s.endTime < new Date(); }

  getStatusLabel(session: StudySession): string {
    if (session.status === 'unscheduled') return 'Non planifiée';
    if (session.isCompleted) return 'Terminée';
    if (this.planning.activeId() === session.id) return 'En cours';
    if (this.isExpired(session)) return 'Expirée';
    return 'Planifiée';
  }

  getStatusIcon(session: StudySession): string {
    if (session.status === 'unscheduled') return 'event_busy';
    if (session.isCompleted) return 'check_circle';
    if (this.planning.activeId() === session.id) return 'radio_button_checked';
    if (this.isExpired(session)) return 'error_outline';
    return 'schedule';
  }

  getStatusBadgeClass(session: StudySession): string {
    const base = 'inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider';
    if (session.status === 'unscheduled')
      return `${base} bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400`;
    if (session.isCompleted)
      return `${base} bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400`;
    if (this.planning.activeId() === session.id)
      return `${base} bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 animate-pulse`;
    if (this.isExpired(session))
      return `${base} bg-rose-50 dark:bg-rose-950/40 text-rose-400 dark:text-rose-500`;
    return `${base} bg-sky-50 dark:bg-sky-950/40 text-sky-500 dark:text-sky-400`;
  }

  isPausedSession(s: StudySession): boolean {
    if (s.isCompleted || this.isExpired(s)) return false;
    // Session mise en pause explicitement → pausedElapsedSeconds enregistré
    const hasSavedTime = (s.pausedElapsedSeconds ?? 0) > 0 || (s.actualDurationMinutes ?? 0) > 0;
    return hasSavedTime;
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.subjectFilter.set('');
    this.sessionTypeFilter.set('');
  }

  openAddSessionModal(): void {
    this.newSessionScope.set('course');
    this.newSession = { subjectId: '', startTime: '', endTime: '', isGroupSession: false };
    this.showAddModal.set(true);
  }

  setNewSessionScope(scope: 'course' | 'project'): void {
    if (this.newSessionScope() === scope) return;
    this.newSessionScope.set(scope);
    const ok = this.subjectsForNewSession().some((s) => s.id === this.newSession.subjectId);
    if (!ok) this.newSession.subjectId = '';
    if (!ok) this.newSession.isGroupSession = false;
  }

  onNewSessionSubjectChange(subjectId: string): void {
    const selected = this.planning.subjects().find((s) => s.id === subjectId);
    if (!selected) return;
    this.newSession.isGroupSession = selected.workMode === 'group';
  }

  startSession(id: string): void {
    this.planning.startSessionHttp(id);
    this.router.navigate(['/app/sessions/active', id]);
  }

  viewSessionDetails(id: string): void {
    this.router.navigate(['/app/sessions/details', id]);
  }
  regenerate(): void {
    this.router.navigate(['/app/planning']);
  }

  deleteSession(id: string): void {
    // Suppression définitive dans la base de données (DELETE /sessions/{id})
    // pour tous les types de sessions : personnelles ET de groupe.
    this.planning.deleteSession(id);
    this.toast.show('Session supprimée définitivement.', 'info');
  }

  addSession(): void {
    if (!this.newSession.subjectId || !this.newSession.startTime) return;
    const selected = this.planning.subjects().find((s) => s.id === this.newSession.subjectId);
    const isGroupSession = selected?.workMode === 'group' ? true : this.newSession.isGroupSession;

    const start = new Date(this.newSession.startTime);
    const end   = new Date(this.newSession.endTime || this.newSession.startTime);

    if (end <= start) {
      this.toast.show("L'heure de fin doit être après l'heure de début.", 'error');
      return;
    }

    // Vérification du non-chevauchement
    if (this.conflicts.hasConflict(this.planning.sessions(), '__new__', start, end)) {
      this.toast.show('Ce créneau chevauche une session existante. Choisissez un autre horaire.', 'error');
      return;
    }

    this.planning.addSessionHttp({
      subjectId:   this.newSession.subjectId,
      startTime:   start,
      endTime:     end,
      isCompleted: false,
      isGroupSession,
    });

    this.showAddModal.set(false);
    this.newSessionScope.set('course');
    this.newSession = { subjectId: '', startTime: '', endTime: '', isGroupSession: false };
    this.toast.show('Session ajoutée avec succès !');
  }

  openShareModal(session: StudySession): void {
    this.shareTargetSession.set(session);
    const groups = this.collab.groups();
    // Pré-sélectionner : le groupId de la session si déjà défini, sinon le seul groupe dispo
    const preselect = session.groupId
      ? session.groupId
      : groups.length === 1 ? groups[0].id : '';
    this.selectedShareGroupId.set(preselect);
    this.showShareModal.set(true);
  }

  confirmShare(): void {
    const session = this.shareTargetSession();
    const groupId = this.selectedShareGroupId();
    if (!session || !groupId || this.isSharing()) return;

    // Vérification du non-chevauchement avant le partage
    const start = new Date(session.startTime);
    const end   = new Date(session.endTime);
    // Exclure la session elle-même du check
    if (this.conflicts.hasConflict(this.planning.sessions(), session.id, start, end)) {
      this.toast.show(
        'Cette session chevauche une autre session déjà planifiée. Modifiez l\'horaire avant de partager.',
        'error'
      );
      return;
    }

    this.isSharing.set(true);
    this.planning.shareSessionWithGroup(session.id, groupId).subscribe({
      next: () => {
        this.isSharing.set(false);
        this.showShareModal.set(false);
        const groupName = this.groupName(groupId);
        this.toast.show(`Session partagée avec ${groupName} !`, 'success');
      },
      error: () => {
        this.isSharing.set(false);
        this.toast.show('Erreur lors du partage. Réessayez.', 'error');
      }
    });
  }

  openInvite(): void { this.showInviteModal.set(true); }

  copyLink(): void {
    navigator.clipboard.writeText('https://syncstudy.app/join/xyz123');
    this.toast.show('Lien copié !');
  }

  sendInvite(): void {
    this.toast.show(`Invitation envoyée à ${this.inviteEmail}`, 'info');
    this.showInviteModal.set(false);
    this.inviteEmail = '';
  }
}
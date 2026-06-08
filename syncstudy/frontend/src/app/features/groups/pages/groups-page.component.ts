import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CollaborationService } from '../../../core/services/collaboration.service';
import { PlanningService } from '../../../core/services/planning.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { SocketService } from '../../../core/services/socket.service';
import { ChatPanelComponent } from '../components/chat-panel/chat-panel.component';
import { Group, GroupTask } from '../../../core/models/group.model';
import { HttpClient } from '@angular/common/http';
import { API_PATHS } from '../../../core/api/api.constants';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-groups-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatPanelComponent],
  template: `
    <div class="space-y-8 fade-in">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-black text-slate-900 dark:text-white">
            Groupes de Travail
          </h1>
          <p class="text-slate-500 dark:text-slate-400 mt-1">
            Collaborez avec vos camarades de classe.
          </p>
        </div>
        <div class="flex flex-wrap gap-2 self-start">
          <button type="button" (click)="showJoinCodeModal.set(true)"
                  class="border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 px-5 py-3 rounded-2xl font-bold
                         hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2">
            <span class="material-icons text-lg">vpn_key</span>
            Rejoindre avec un code
          </button>
          <button (click)="showCreateModal.set(true)"
                  class="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold
                         hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100
                         flex items-center gap-2">
            <span class="material-icons text-lg">add</span>
            Nouveau Groupe
          </button>
        </div>
      </div>

      <div class="max-w-xl">
        <div class="relative">
          <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          <input type="text" [ngModel]="groupSearchQuery()" (ngModelChange)="groupSearchQuery.set($event)"
                 placeholder="Rechercher un groupe par nom ou description…"
                 class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl pl-11 pr-4 py-3 text-sm font-semibold
                        text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>
      </div>

      <!-- Group cards grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        @for (g of filteredGroups(); track g.id) {
          <div class="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 
                      shadow-sm hover:shadow-md transition-all duration-300 group">
            <!-- Top: colored initial + avatar stack -->
            <div class="flex items-start justify-between mb-6">
              <div [class]="'w-16 h-16 rounded-2xl flex items-center justify-center text-2xl text-white font-black shadow-lg ' + g.colorClass">
                {{ g.name[0] }}
              </div>
              <!-- Avatar stack -->
              <div class="flex -space-x-3">
                @for (av of avatarSeeds(g); track av; let i = $index) {
                  <img [src]="av" alt="Member"
                       class="w-10 h-10 rounded-full border-4 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-700" />
                }
                <div class="w-10 h-10 rounded-full border-4 border-white dark:border-slate-900 
                            bg-slate-100 dark:bg-slate-700 flex items-center justify-center 
                            text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  +{{ extraMembersCount(g) }}
                </div>
              </div>
            </div>

            <!-- Info -->
            <h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">{{ g.name }}</h3>
            <p class="text-slate-500 dark:text-slate-400 mb-6 line-clamp-2 text-sm">{{ g.description }}</p>

            <!-- Footer actions -->
            <div class="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-700">
              <button (click)="openDetails(g)"
                      class="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                Voir détails
              </button>
              <div class="flex gap-2">
                @if (collab.isOwner(g, auth.currentUser()?.id)) {
                  <button (click)="openInvite(g)"
                          class="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400
                                 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                          title="Inviter des membres (propriétaire uniquement)">
                    <span class="material-icons text-xl">person_add</span>
                  </button>
                }
                @if (g.isJoined) {
                  <button type="button"
                          (click)="openChat(g); $event.stopPropagation()"
                          class="p-3 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md"
                          title="Ouvrir le chat du groupe">
                    <span class="material-icons text-xl">chat</span>
                  </button>
                  <button type="button"
                          class="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 
                                 px-6 py-2.5 rounded-2xl font-bold text-sm cursor-default">
                    Membre
                  </button>
                } @else {
                  <button (click)="join(g)"
                          class="bg-slate-900 dark:bg-white dark:text-slate-900 text-white 
                                 px-6 py-2.5 rounded-2xl font-bold hover:bg-slate-800 dark:hover:bg-slate-100 
                                 transition-all text-sm">
                    Rejoindre
                  </button>
                }
              </div>
            </div>
          </div>
        } @empty {
          <div class="col-span-2 text-center py-16">
            <span class="material-icons text-5xl text-slate-200 dark:text-slate-700 block mb-3">group</span>
            <p class="text-slate-400 dark:text-slate-500 font-medium">Aucun groupe. Créez-en un !</p>
          </div>
        }
      </div>
    </div>

    <!-- ====================== MODALS ====================== -->

    <!-- Group detail modal -->
    @if (selectedGroup()) {
      <div class="fixed inset-0 bg-slate-900/70 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center fade-in"
           (click)="selectedGroup.set(null)">
        <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden"
             (click)="$event.stopPropagation()">
          <!-- Colored header -->
          <div [class]="'p-8 text-white relative ' + selectedGroup()!.colorClass">
            <button (click)="selectedGroup.set(null)"
                    class="absolute top-4 right-4 w-9 h-9 bg-white/20 hover:bg-white/30
                           rounded-full flex items-center justify-center transition-all">
              <span class="material-icons text-white text-base">close</span>
            </button>
            @if (collab.isOwner(selectedGroup()!, auth.currentUser()?.id)) {
              <button type="button" (click)="openEditGroup()"
                      class="absolute top-4 right-16 w-9 h-9 bg-white/20 hover:bg-white/30
                             rounded-full flex items-center justify-center transition-all"
                      title="Modifier les informations du groupe">
                <span class="material-icons text-white text-base">edit</span>
              </button>
            }
            <h2 class="text-2xl font-black mb-1">{{ selectedGroup()!.name }}</h2>
            <p class="text-white/80 text-sm">{{ selectedGroup()!.members }} membres actifs</p>
          </div>

          <div class="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Left: description + members -->
            <div>
              <p class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">DESCRIPTION</p>
              <p class="text-sm text-slate-600 dark:text-slate-300 mb-6">{{ selectedGroup()!.description }}</p>

              <p class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">MEMBRES</p>
              <div class="space-y-3">
                @for (m of membersForGroup(selectedGroup()!); track m.id) {
                  <div class="flex items-center gap-3">
                    <img [src]="'https://api.dicebear.com/7.x/avataaars/svg?seed=' + m.name"
                         class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700" [alt]="m.name" />
                    <span class="text-sm font-semibold text-slate-900 dark:text-white flex-1">{{ m.name }}</span>
                    <span class="text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800
                                 px-3 py-0.5 rounded-full">
                      {{ m.role }}
                    </span>
                    @if (collab.isOwner(selectedGroup()!, auth.currentUser()?.id) && m.role !== 'Propriétaire') {
                      <button type="button"
                              (click)="removeMember(selectedGroup()!, m)"
                              title="Retirer ce membre"
                              class="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-all">
                        <span class="material-icons text-base">person_remove</span>
                      </button>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- Right: actions -->
            <div>
              <p class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">ACTIONS DE GROUPE</p>
              <div class="space-y-3">
                <button (click)="openChatFromDetail()"
                        class="w-full bg-indigo-600 text-white py-3.5 px-5 rounded-2xl font-bold
                               hover:bg-indigo-700 transition-all flex items-center gap-3">
                  <span class="material-icons">chat</span>
                  Ouvrir le chat
                </button>
                <button (click)="openSharedSessionFromDetail()"
                        class="w-full border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white 
                               py-3.5 px-5 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all 
                               flex items-center gap-3">
                  <span class="material-icons">calendar_month</span>
                  Créer une session partagée
                </button>
                @if (collab.isOwner(selectedGroup()!, auth.currentUser()?.id)) {
                  <button (click)="openInvite(selectedGroup()!); selectedGroup.set(null)"
                          class="w-full border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white
                                 py-3.5 px-5 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all
                                 flex items-center gap-3">
                    <span class="material-icons">person_add</span>
                    Inviter des camarades
                  </button>
                }
                <button (click)="leave(selectedGroup()!); selectedGroup.set(null)"
                        class="w-full border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 
                               bg-rose-50 dark:bg-rose-950 py-3.5 px-5 rounded-2xl font-bold
                               hover:bg-rose-100 dark:hover:bg-rose-900 transition-all flex items-center gap-3">
                  <span class="material-icons">person_remove</span>
                  Quitter le groupe
                </button>
                @if (collab.isOwner(selectedGroup()!, auth.currentUser()?.id)) {
                  <button (click)="dissolve(selectedGroup()!); selectedGroup.set(null)"
                          class="w-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 
                                 py-3.5 px-5 rounded-2xl font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-3">
                    <span class="material-icons">delete_forever</span>
                    Dissoudre le groupe
                  </button>
                }
              </div>
            </div>
          </div>

          <!-- Tâches du groupe -->
          @if ((selectedGroup()!.tasks ?? []).length > 0) {
            <div class="px-8 pb-6 border-t border-slate-100 dark:border-slate-700 pt-6">
              <p class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                OBJECTIFS DU GROUPE
              </p>
              <div class="space-y-2">
                @for (task of selectedGroup()!.tasks ?? []; track task.id) {
                  <div class="flex items-center gap-3 p-2.5 rounded-xl"
                       [class]="task.done ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-slate-50 dark:bg-slate-800/50'">
                    <span class="material-icons text-base"
                          [class]="task.done ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'">
                      {{ task.done ? 'check_circle' : 'radio_button_unchecked' }}
                    </span>
                    <span class="flex-1 text-sm font-medium"
                          [class]="task.done ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'">
                      {{ task.text }}
                    </span>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Sessions partagées -->
          @if (groupSharedSessions().length > 0) {
            <div class="px-8 pb-8 border-t border-slate-100 dark:border-slate-700 pt-6">
              <p class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
                SESSIONS PARTAGÉES ({{ groupSharedSessions().length }})
              </p>
              <!-- Liste scrollable : max 4 sessions visibles, puis scroll -->
              <div class="space-y-2 max-h-64 overflow-y-auto pr-1">
                @for (s of groupSharedSessions(); track s.id) {
                  <div class="flex items-center gap-3 p-3 rounded-2xl border border-indigo-100 dark:border-indigo-900
                              bg-indigo-50/40 dark:bg-indigo-950/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-all">
                    <div class="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center shrink-0">
                      <span class="material-icons text-indigo-600 dark:text-indigo-400 text-base">event</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {{ subjectNameById(s.subjectId, s.title) }}
                      </p>
                      <p class="text-xs text-slate-500 dark:text-slate-400">
                        {{ s.startTime | date:'dd/MM/yyyy' }}
                        &nbsp;·&nbsp;
                        {{ s.startTime | date:'HH:mm' }} – {{ s.endTime | date:'HH:mm' }}
                      </p>
                    </div>
                    <!-- Actions -->
                    <div class="flex items-center gap-1 shrink-0">
                      <!-- Modifier : propriétaire uniquement -->
                      @if (collab.isOwner(selectedGroup()!, auth.currentUser()?.id)) {
                        <button type="button"
                                (click)="openEditSharedSession(s)"
                                title="Modifier le créneau"
                                class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-all">
                          <span class="material-icons text-base">edit</span>
                        </button>
                      }
                      <!-- Masquer pour moi : tous les membres -->
                      <button type="button"
                              (click)="hideSessionForMe(s.id)"
                              title="Retirer de mon planning (ne supprime pas pour les autres)"
                              class="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition-all">
                        <span class="material-icons text-base">visibility_off</span>
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>
    }

    <!-- Modal édition groupe -->
    @if (showEditGroupModal()) {
      <div class="fixed inset-0 bg-slate-900/70 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center fade-in"
           (click)="showEditGroupModal.set(false)">
        <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg mx-4 border border-slate-200 dark:border-slate-700 overflow-hidden"
             (click)="$event.stopPropagation()">
          <div class="p-8 border-b border-slate-100 dark:border-slate-800">
            <h3 class="text-xl font-black text-slate-900 dark:text-white">Modifier le groupe</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Mettez à jour les informations et les objectifs.</p>
          </div>
          <div class="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
            <!-- Nom -->
            <div>
              <label class="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Nom du groupe</label>
              <input [(ngModel)]="editGroupData.name" type="text"
                     class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-semibold
                            text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <!-- Description -->
            <div>
              <label class="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Description</label>
              <textarea [(ngModel)]="editGroupData.description" rows="3"
                        class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-semibold
                               text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"></textarea>
            </div>
            <!-- Tâches / Objectifs -->
            <div>
              <label class="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
                OBJECTIFS DU GROUPE ({{ editGroupTasks().length }})
              </label>
              <div class="space-y-2 mb-3">
                @for (task of editGroupTasks(); track task.id) {
                  <div class="flex items-center gap-2 p-2.5 rounded-xl border"
                       [class]="task.done
                         ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30'
                         : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'">
                    <button type="button" (click)="toggleTask(task.id)"
                            class="shrink-0 focus:outline-none">
                      <span class="material-icons text-base"
                            [class]="task.done ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'">
                        {{ task.done ? 'check_circle' : 'radio_button_unchecked' }}
                      </span>
                    </button>
                    <span class="flex-1 text-sm font-medium"
                          [class]="task.done ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'">
                      {{ task.text }}
                    </span>
                    <button type="button" (click)="removeTask(task.id)"
                            class="shrink-0 p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-all">
                      <span class="material-icons text-base">close</span>
                    </button>
                  </div>
                }
              </div>
              <!-- Ajouter une tâche -->
              <div class="flex gap-2">
                <input [(ngModel)]="newTaskText" type="text" placeholder="Nouvelle tâche…"
                       (keydown.enter)="addTask()"
                       class="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-sm font-semibold
                              text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                <button type="button" (click)="addTask()"
                        class="bg-indigo-600 text-white px-4 py-2.5 rounded-2xl font-bold hover:bg-indigo-700 transition-all">
                  <span class="material-icons text-base">add</span>
                </button>
              </div>
            </div>
          </div>
          <div class="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3 justify-end">
            <button type="button" (click)="showEditGroupModal.set(false)"
                    class="px-5 py-2.5 rounded-2xl font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700
                           hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
              Annuler
            </button>
            <button type="button" (click)="saveEditGroup()"
                    class="bg-indigo-600 text-white px-6 py-2.5 rounded-2xl font-bold hover:bg-indigo-700 transition-all">
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Rejoindre par code -->
    @if (showJoinCodeModal()) {
      <div class="fixed inset-0 bg-slate-900/70 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center fade-in"
           (click)="showJoinCodeModal.set(false)">
        <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 w-full max-w-md mx-4 border border-slate-200 dark:border-slate-700"
             (click)="$event.stopPropagation()">
          <h3 class="text-2xl font-black text-slate-900 dark:text-white mb-2">Rejoindre un groupe</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Saisissez le code d’invitation à 8 caractères.</p>
          <input [(ngModel)]="joinCodeInput" type="text" maxlength="12" placeholder="ex: COMPIL24"
                 class="w-full uppercase tracking-widest font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 
                        rounded-2xl px-4 py-3.5 text-sm text-slate-900 dark:text-white mb-4" />
          <div class="flex justify-end gap-3">
            <button type="button" (click)="showJoinCodeModal.set(false)"
                    class="px-5 py-2.5 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Annuler</button>
            <button type="button" (click)="submitJoinCode()"
                    class="bg-indigo-600 text-white px-6 py-2.5 rounded-2xl font-bold hover:bg-indigo-700">Rejoindre</button>
          </div>
        </div>
      </div>
    }

    <!-- Create group modal -->
    @if (showCreateModal()) {
      <div class="fixed inset-0 bg-slate-900/70 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center fade-in"
           (click)="showCreateModal.set(false)">
        <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 w-full max-w-md mx-4"
             (click)="$event.stopPropagation()">
          <h3 class="text-2xl font-black text-slate-900 dark:text-white mb-6">Nouveau Groupe</h3>
          <form (ngSubmit)="createGroup()" class="space-y-5">
            <div>
              <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nom du groupe</label>
              <input [(ngModel)]="newGroup.name" name="name" type="text" placeholder="ex: Groupe Java"
                     class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 
                            rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 
                            dark:text-white transition-all" />
            </div>
            <div>
              <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Description</label>
              <textarea [(ngModel)]="newGroup.description" name="desc" rows="3"
                        placeholder="Décrivez l'objectif du groupe..."
                        class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 
                               rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 
                               dark:text-white transition-all resize-none">
              </textarea>
            </div>
            <div>
              <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Couleur</label>
              <div class="flex gap-3 flex-wrap">
                @for (c of groupColors; track c) {
                  <button type="button" (click)="newGroup.colorClass = c"
                          [class]="c + ' w-10 h-10 rounded-2xl transition-all shadow-sm ' 
                                 + (newGroup.colorClass === c ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110' : 'hover:scale-110')">
                  </button>
                }
              </div>
            </div>
            <div class="flex justify-between items-center pt-4">
              <button type="button" (click)="showCreateModal.set(false)"
                      class="text-slate-500 dark:text-slate-400 font-bold px-5 py-2 hover:text-slate-700 dark:hover:text-slate-200">
                Annuler
              </button>
              <button type="submit"
                      class="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all">
                Créer le groupe
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Invite modal -->
    @if (showInviteModal()) {
      <div class="fixed inset-0 bg-slate-900/70 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center fade-in"
           (click)="closeInviteModal()">
        <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 w-full max-w-md mx-4"
             (click)="$event.stopPropagation()">
          <h3 class="text-2xl font-black text-slate-900 dark:text-white mb-1">Inviter des membres</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Code d’invitation du groupe (CDC §4.3.1).</p>
          
          <div class="space-y-6">
            <div>
              <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Code d’invitation</label>
              <div class="flex gap-2">
                <input type="text" readonly [value]="inviteTargetGroup()?.inviteCode ?? ''"
                       class="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 
                              rounded-2xl px-4 py-3.5 text-sm font-mono font-black text-slate-900 dark:text-white tracking-widest" />
                <button type="button" (click)="copyInviteCode()"
                        class="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-6 rounded-2xl 
                               font-bold text-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-all">
                  Copier
                </button>
              </div>
            </div>
            <div>
              <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Ou inviter par email</label>
              <input [(ngModel)]="inviteEmail" type="email" placeholder="email@exemple.com"
                     class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 
                            rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 
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

    <!-- Shared session modal -->
    @if (showSharedSession()) {
      <div class="fixed inset-0 bg-slate-900/70 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center fade-in"
           (click)="showSharedSession.set(false)">
        <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 w-full max-w-md mx-4"
             (click)="$event.stopPropagation()">
          <h3 class="text-2xl font-black text-slate-900 dark:text-white mb-6">Créer une session partagée</h3>
          <form (ngSubmit)="createSharedSession()" class="space-y-5">
            <div>
              <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Portée de la session</label>
              <div class="flex gap-3">
                <button type="button" (click)="setSharedSessionScope('course')"
                        [class]="sharedSessionScope() === 'course'
                          ? 'flex-1 py-3 rounded-2xl border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-sm flex items-center justify-center gap-2'
                          : 'flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition'">
                  <span class="material-icons text-base">menu_book</span> Cours
                </button>
                <button type="button" (click)="setSharedSessionScope('project')"
                        [class]="sharedSessionScope() === 'project'
                          ? 'flex-1 py-3 rounded-2xl border-2 border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-sm flex items-center justify-center gap-2'
                          : 'flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition'">
                  <span class="material-icons text-base">build</span> Projet
                </button>
              </div>
            </div>
            <div>
              <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                {{ sharedSessionScope() === 'project' ? 'Projet' : 'Cours / matière' }}
              </label>
              <select [(ngModel)]="sharedSession.subjectId" name="subjectId"
                      class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                             rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500
                             dark:text-white transition-all">
                <option value="" disabled>
                  {{ sharedSessionScope() === 'project' ? 'Sélectionner un projet' : 'Sélectionner un cours' }}
                </option>
                @for (s of subjectsForSharedSession(); track s.id) {
                  <option [value]="s.id">{{ s.name }}</option>
                }
              </select>
              @if (!subjectsForSharedSession().length) {
                <p class="mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                  {{ sharedSessionScope() === 'project'
                    ? 'Aucun projet en mode "Groupe" trouvé. Créez un projet avec le mode de travail "En groupe" depuis la page Projets.'
                    : 'Aucun cours en mode "Groupe" trouvé. Créez une matière avec le mode de travail "En groupe" depuis la page Matières.' }}
                </p>
              }
            </div>
            <div class="grid grid-cols-2 gap-4">
              <!-- Début : date + heure 24h + minutes (sans AM/PM) -->
              <div>
                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Début</label>
                <input type="date"
                       [(ngModel)]="sharedStartDate" (ngModelChange)="syncSharedTimes()"
                       name="sharedStartDate"
                       class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                              rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500
                              dark:text-white transition-all mb-2" />
                <div class="flex gap-2">
                  <select [(ngModel)]="sharedStartHour" (ngModelChange)="syncSharedTimes()"
                          name="sharedStartHour"
                          class="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                                 rounded-2xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2
                                 focus:ring-indigo-500 dark:text-white transition-all">
                    @for (h of timeHours; track h) {
                      <option [value]="h">{{ h }}h</option>
                    }
                  </select>
                  <select [(ngModel)]="sharedStartMin" (ngModelChange)="syncSharedTimes()"
                          name="sharedStartMin"
                          class="w-20 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                                 rounded-2xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2
                                 focus:ring-indigo-500 dark:text-white transition-all">
                    @for (m of timeMinutes; track m) {
                      <option [value]="m">:{{ m }}</option>
                    }
                  </select>
                </div>
              </div>
              <!-- Fin : date + heure 24h + minutes (sans AM/PM) -->
              <div>
                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Fin</label>
                <input type="date"
                       [(ngModel)]="sharedEndDate" (ngModelChange)="syncSharedTimes()"
                       name="sharedEndDate"
                       class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                              rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500
                              dark:text-white transition-all mb-2" />
                <div class="flex gap-2">
                  <select [(ngModel)]="sharedEndHour" (ngModelChange)="syncSharedTimes()"
                          name="sharedEndHour"
                          class="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                                 rounded-2xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2
                                 focus:ring-indigo-500 dark:text-white transition-all">
                    @for (h of timeHours; track h) {
                      <option [value]="h">{{ h }}h</option>
                    }
                  </select>
                  <select [(ngModel)]="sharedEndMin" (ngModelChange)="syncSharedTimes()"
                          name="sharedEndMin"
                          class="w-20 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                                 rounded-2xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2
                                 focus:ring-indigo-500 dark:text-white transition-all">
                    @for (m of timeMinutes; track m) {
                      <option [value]="m">:{{ m }}</option>
                    }
                  </select>
                </div>
              </div>
            </div>
            <div class="flex justify-between items-center pt-4">
              <button type="button" (click)="showSharedSession.set(false)"
                      class="text-slate-500 dark:text-slate-400 font-bold px-5 py-2">Annuler</button>
              <button type="submit"
                      class="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all">
                Partager
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Chat panel -->
    <app-chat-panel [isOpen]="chatOpen()" [groupId]="activeChatId()"
                    [groupName]="activeChatName()" (close)="onChatClose()" />
  `,
})
export class GroupsPageComponent implements OnInit {
  collab   = inject(CollaborationService);
  planning = inject(PlanningService);
  auth     = inject(AuthService);
  toast    = inject(ToastService);
  socket   = inject(SocketService);
  notif    = inject(NotificationService);
  http     = inject(HttpClient);

  selectedGroup        = signal<Group | null>(null);
  showCreateModal      = signal(false);
  showInviteModal      = signal(false);
  showSharedSession    = signal(false);
  showJoinCodeModal    = signal(false);
  showEditGroupModal   = signal(false);
  chatOpen             = signal(false);
  activeChatId         = signal('');
  activeChatName       = signal('');
  groupSearchQuery     = signal('');
  inviteTargetGroup    = signal<Group | null>(null);
  sharedSessionGroupId = signal('');
  editGroupTasks       = signal<GroupTask[]>([]);
  newTaskText          = '';

  inviteEmail   = '';
  joinCodeInput = '';
  newGroup      = { name: '', description: '', colorClass: 'bg-blue-500' };
  editGroupData = { name: '', description: '' };
  sharedSession = { subjectId: '', startTime: '', endTime: '' };

  // Parties séparées pour les sélecteurs 24h (contourne l'AM/PM de Chrome Windows)
  sharedStartDate = '';
  sharedStartHour = '09';
  sharedStartMin  = '00';
  sharedEndDate   = '';
  sharedEndHour   = '11';
  sharedEndMin    = '00';
  readonly timeHours   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  readonly timeMinutes = ['00', '15', '30', '45'];

  sharedSessionScope    = signal<'course' | 'project'>('course');
  editingSessionId      = signal<string | null>(null);

  /** Sessions partagées du groupe actuellement ouvert dans le modal détail */
  groupSharedSessions = computed(() => {
    const gid = this.selectedGroup()?.id;
    if (!gid) return [];
    return this.planning.sessions()
      .filter(s => s.isGroupSession && s.groupId === gid && !s.isCompleted)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  });

  // N'affiche que les matières/projets configurés en mode "groupe"
  subjectsForSharedSession = computed(() =>
    this.planning.subjects().filter(
      (s) =>
        (s.studyType ?? 'course') === this.sharedSessionScope() &&
        s.workMode === 'group'
    )
  );

  filteredGroups = computed(() => {
    const q = this.groupSearchQuery().toLowerCase().trim();
    return this.collab.groups().filter(
      (g) =>
        !q ||
        g.name.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.inviteCode.toLowerCase().includes(q)
    );
  });

  groupColors = ['bg-blue-500', 'bg-indigo-500', 'bg-rose-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500'];

  ngOnInit(): void {
    // Recharger les matières/projets depuis le backend pour garantir la liste à jour
    this.planning.loadFromBackend();
    // Recharger les groupes de l'utilisateur courant (évite l'affichage de groupes d'un autre compte)
    this.collab.reload();
    // Recharger les notifications pour afficher immédiatement les invitations reçues
    this.notif.loadNotifications();
  }

  avatarSeeds(g: Group): string[] {
    const names = (g.memberDetails ?? []).slice(0, 3).map((m) => m.name);
    if (!names.length) {
      names.push(g.name);
    }
    return names.map((name) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`);
  }

  extraMembersCount(g: Group): number {
    const shown = Math.min((g.memberDetails ?? []).length || 1, 3);
    return Math.max(0, g.members - shown);
  }

  removeMember(g: Group, member: { id: string; name: string; role: string }): void {
    if (!confirm(`Retirer "${member.name}" du groupe ?`)) return;
    this.collab.removeMember(g.id, member.id, member.name);
    // Mettre à jour le groupe sélectionné localement pour feedback immédiat
    this.selectedGroup.update((current) => {
      if (!current || current.id !== g.id) return current;
      return {
        ...current,
        members: Math.max(0, current.members - 1),
        memberDetails: (current.memberDetails ?? []).filter((m) => m.id !== member.id),
      };
    });
  }

  membersForGroup(g: Group): Array<{ id: string; name: string; role: string }> {
    const real = g.memberDetails ?? [];
    if (real.length) return real;
    const me = this.auth.currentUser();
    return me ? [{ id: me.id, name: me.name, role: g.ownerId === me.id ? 'Propriétaire' : 'Membre' }] : [];
  }

  openDetails(g: Group): void {
    this.selectedGroup.set(g);
  }
  join(g: Group): void {
    this.collab.joinGroup(g.id);
  }

  openChat(g: Group): void {
    if (!g.isJoined) return;
    this.activeChatId.set(g.id);
    this.activeChatName.set(g.name);
    this.collab.enterChatRoom(g.id);
    this.chatOpen.set(true);
  }

  openChatFromDetail(): void {
    const g = this.selectedGroup();
    if (!g?.isJoined) return;
    this.selectedGroup.set(null);
    this.openChat(g);
  }

  onChatClose(): void {
    const id = this.activeChatId();
    if (id) this.collab.leaveChatRoom(id);
    this.chatOpen.set(false);
  }
  leave(g: Group): void {
    this.collab.leaveGroup(g.id);
  }
  dissolve(g: Group): void {
    this.collab.dissolveGroup(g.id, this.auth.currentUser()?.id ?? '');
  }

  openInvite(g: Group): void {
    this.inviteTargetGroup.set(g);
    this.showInviteModal.set(true);
  }

  closeInviteModal(): void {
    this.showInviteModal.set(false);
    this.inviteTargetGroup.set(null);
  }

  copyInviteCode(): void {
    const code = this.inviteTargetGroup()?.inviteCode;
    if (code) {
      navigator.clipboard.writeText(code);
      this.toast.show('Code copié !');
    }
  }

  openEditSharedSession(session: any): void {
    this.editingSessionId.set(session.id);
    this.sharedSessionGroupId.set(session.groupId ?? '');
    const subject = this.planning.subjects().find(s => s.id === session.subjectId);
    this.sharedSessionScope.set(subject?.studyType === 'project' ? 'project' : 'course');
    const toLocal = (d: Date | string) => this.toDateTimeString(d instanceof Date ? d : new Date(d));
    this.sharedSession = {
      subjectId: session.subjectId,
      startTime: toLocal(session.startTime),
      endTime:   toLocal(session.endTime),
    };
    this.setSharedParts(this.sharedSession.startTime, this.sharedSession.endTime);
    this.showSharedSession.set(true);
  }

  subjectNameById(subjectId: string, fallback?: string): string {
    return this.planning.subjects().find(s => s.id === subjectId)?.name ?? fallback ?? '—';
  }

  deleteSharedSession(sessionId: string): void {
    if (!confirm('Supprimer cette session partagée pour tous les membres ?')) return;
    this.planning.deleteSession(sessionId);
    this.toast.show('Session partagée supprimée.', 'info');
  }

  /**
   * Retire la session du planning de l'utilisateur courant uniquement.
   * Les autres membres du groupe ne sont pas affectés (forAll=false).
   */
  hideSessionForMe(sessionId: string): void {
    this.planning.deleteSessionCopyOnly(sessionId);
    this.toast.show('Session retirée de votre planning.', 'info');
  }

  openEditGroup(): void {
    const g = this.selectedGroup();
    if (!g) return;
    this.editGroupData = { name: g.name, description: g.description ?? '' };
    this.editGroupTasks.set((g.tasks ?? []).map(t => ({ ...t })));
    this.showEditGroupModal.set(true);
  }

  addTask(): void {
    const text = this.newTaskText.trim();
    if (!text) return;
    const task: GroupTask = { id: Date.now().toString(), text, done: false };
    this.editGroupTasks.update(list => [...list, task]);
    this.newTaskText = '';
  }

  toggleTask(taskId: string): void {
    this.editGroupTasks.update(list =>
      list.map(t => t.id === taskId ? { ...t, done: !t.done } : t)
    );
  }

  removeTask(taskId: string): void {
    this.editGroupTasks.update(list => list.filter(t => t.id !== taskId));
  }

  saveEditGroup(): void {
    const g = this.selectedGroup();
    if (!g) return;
    const payload = {
      name: this.editGroupData.name.trim(),
      description: this.editGroupData.description.trim(),
      tasks: this.editGroupTasks(),
    };
    this.http.patch<any>(API_PATHS.group(g.id), payload).subscribe({
      next: (updated) => {
        this.collab.updateGroupLocally(updated);
        this.selectedGroup.set({ ...g, ...updated });
        this.showEditGroupModal.set(false);
        this.toast.show('Groupe mis à jour.', 'success');
      },
      error: () => this.toast.show('Erreur lors de la mise à jour.', 'error'),
    });
  }

  openSharedSessionFromDetail(): void {
    const g = this.selectedGroup();
    this.sharedSessionGroupId.set(g?.id ?? '');
    this.selectedGroup.set(null);
    this.sharedSessionScope.set('course');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDefault = new Date(tomorrow); startDefault.setHours(9, 0, 0, 0);
    const endDefault   = new Date(tomorrow); endDefault.setHours(11, 0, 0, 0);
    this.sharedSession = {
      subjectId: '',
      startTime: this.toDateTimeString(startDefault),
      endTime:   this.toDateTimeString(endDefault),
    };
    this.setSharedParts(this.sharedSession.startTime, this.sharedSession.endTime);
    // Rafraîchir les matières et projets depuis le backend avant d'ouvrir le modal
    this.planning.loadFromBackend();
    this.showSharedSession.set(true);
  }

  /** Combine les 6 parties séparées → met à jour sharedSession.startTime / endTime */
  syncSharedTimes(): void {
    if (this.sharedStartDate) {
      this.sharedSession.startTime = `${this.sharedStartDate}T${this.sharedStartHour}:${this.sharedStartMin}`;
    }
    if (this.sharedEndDate) {
      this.sharedSession.endTime = `${this.sharedEndDate}T${this.sharedEndHour}:${this.sharedEndMin}`;
    }
  }

  private toDateTimeString(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` +
           `T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  private setSharedParts(startDt: string, endDt: string): void {
    const parse = (dt: string) => {
      const [date = '', time = '09:00'] = dt.split('T');
      const [hour = '09', min = '00']  = time.split(':');
      return { date, hour: hour.padStart(2, '0'), min: min.slice(0, 2).padStart(2, '0') };
    };
    const s = parse(startDt);
    const e = parse(endDt);
    this.sharedStartDate = s.date; this.sharedStartHour = s.hour; this.sharedStartMin = s.min;
    this.sharedEndDate   = e.date; this.sharedEndHour   = e.hour; this.sharedEndMin   = e.min;
  }

  private resetSharedParts(): void {
    this.sharedStartDate = ''; this.sharedStartHour = '09'; this.sharedStartMin = '00';
    this.sharedEndDate   = ''; this.sharedEndHour   = '11'; this.sharedEndMin   = '00';
  }

  setSharedSessionScope(scope: 'course' | 'project'): void {
    if (this.sharedSessionScope() === scope) return;
    this.sharedSessionScope.set(scope);
    const ok = this.subjectsForSharedSession().some((s) => s.id === this.sharedSession.subjectId);
    if (!ok) this.sharedSession.subjectId = '';
  }

  createGroup(): void {
    if (!this.newGroup.name.trim()) return;
    const currentUserId = this.auth.currentUser()?.id;
    if (!currentUserId) {
      this.toast.show('Vous devez être connecté pour créer un groupe.', 'error');
      return;
    }
    this.collab.createGroup(
      this.newGroup.name,
      this.newGroup.description,
      this.newGroup.colorClass,
      currentUserId
    );
    this.newGroup = { name: '', description: '', colorClass: 'bg-blue-500' };
    this.showCreateModal.set(false);
    this.toast.show('Groupe créé avec succès !');
  }

  createSharedSession(): void {
    // ── Validations ──────────────────────────────────────────────
    if (!this.sharedSession.subjectId) {
      this.toast.show('Veuillez sélectionner une matière ou un projet.', 'warning');
      return;
    }
    if (!this.sharedSession.startTime || !this.sharedSession.endTime) {
      this.toast.show('Veuillez renseigner la date de début ET de fin.', 'warning');
      return;
    }
    const start = new Date(this.sharedSession.startTime);
    const end   = new Date(this.sharedSession.endTime);
    if (end <= start) {
      this.toast.show('La date de fin doit être après la date de début.', 'warning');
      return;
    }

    // ── Vérification des disponibilités de l'utilisateur courant ─
    const hasAvailability = this.planning.checkAvailabilityForSlot(start, end);
    if (!hasAvailability) {
      // Avertissement non-bloquant : on affiche le message mais on laisse continuer
      this.toast.show(
        'Attention : ce créneau ne correspond à aucune de vos disponibilités configurées. La session sera créée, mais vérifiez que les membres sont disponibles.',
        'warning'
      );
    }

    const gid = this.sharedSessionGroupId();

    // ── Création HTTP (persiste en base, tag GROUPE, vrai ID) ────
    this.planning.createGroupSessionHttp(
      {
        subjectId:      this.sharedSession.subjectId,
        startTime:      start,
        endTime:        end,
        isCompleted:    false,
        isGroupSession: true,
        groupId:        gid || undefined,
      },
      (created) => {
        // Émettre via socket pour notifier tous les membres du groupe
        if (gid) {
          this.socket.emitSharedSessionCreated({
            id:        created.id,
            groupId:   gid,
            subjectId: created.subjectId,
            startTime: (created.startTime instanceof Date ? created.startTime : new Date(created.startTime)).toISOString(),
            endTime:   (created.endTime   instanceof Date ? created.endTime   : new Date(created.endTime)).toISOString(),
          });
        }
        this.toast.show('Session partagée créée et ajoutée au planning !', 'success');
      },
      () => {
        this.toast.show('Erreur lors de la création de la session partagée.', 'error');
      }
    );

    const editId = this.editingSessionId();

    if (editId) {
      // ── Mode édition : PATCH la session existante ────────────
      this.planning.updateSessionSlotHttp(editId, start, end, this.sharedSession.subjectId);
      this.toast.show('Session partagée mise à jour !', 'success');
      this.editingSessionId.set(null);
      this.showSharedSession.set(false);
      this.sharedSession = { subjectId: '', startTime: '', endTime: '' };
      this.resetSharedParts();
      return;
    }

    // ── Fermer le modal immédiatement ────────────────────────────
    this.showSharedSession.set(false);
    this.sharedSessionGroupId.set('');
    this.sharedSessionScope.set('course');
    this.sharedSession = { subjectId: '', startTime: '', endTime: '' };
    this.resetSharedParts();
  }

  submitJoinCode(): void {
    this.collab.joinGroupByCode(this.joinCodeInput);
    this.showJoinCodeModal.set(false);
    this.joinCodeInput = '';
  }

  sendInvite(): void {
    const email = this.inviteEmail.trim();
    const g = this.inviteTargetGroup();
    const gid = g?.id;
    const uid = this.auth.currentUser()?.id;

    // Vérification propriétaire
    if (!g || !uid || !this.collab.isOwner(g, uid)) {
      this.toast.show('Seul le propriétaire du groupe peut envoyer des invitations.', 'error');
      return;
    }

    // Validation format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      this.toast.show('Veuillez saisir une adresse email.', 'warning');
      return;
    }
    if (!emailRegex.test(email)) {
      this.toast.show('Adresse email invalide.', 'warning');
      return;
    }

    if (gid) {
      // Le modal se ferme via le callback dans CollaborationService (succès ou 503)
      this.collab.inviteMemberByEmail(gid, email, () => {
        this.closeInviteModal();
        this.inviteEmail = '';
      });
    }
  }
}
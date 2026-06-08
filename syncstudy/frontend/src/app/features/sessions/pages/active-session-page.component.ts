import { Component, inject, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PlanningService } from '../../../core/services/planning.service';
import { ToastService } from '../../../core/services/toast.service';
import { SocketService } from '../../../core/services/socket.service';
import { AuthService } from '../../../core/services/auth.service';
import { Subscription } from 'rxjs';

interface KanbanCard  { id: string; text: string; col: 'todo' | 'doing' | 'done'; authorName?: string; }
interface TodoItem    { id: string; text: string; done: boolean; authorName?: string; }
interface ChatMessage { id: string; senderId: string; senderName: string; text: string; time: string; }
interface CourseItem  { id: string; type: 'definition' | 'formula' | 'reference'; title: string; content: string; authorName?: string; }
interface SessionNote { id: string; authorId: string; authorName: string; text: string; createdAt: string; }

@Component({
  selector: 'app-active-session-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Full-page immersive workspace -->
    <div class="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden fade-in">

      <!-- ===================== TOP BAR ===================== -->
      <header class="flex-shrink-0 flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div class="flex items-center gap-4">
          <!-- color bubble -->
          <div class="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0"
               [style.backgroundColor]="subjectColor()">
            <span class="material-icons text-lg">{{ studyType() === 'project' ? 'build' : 'menu_book' }}</span>
          </div>
          <div>
            <h1 class="text-xl font-black text-slate-900 dark:text-white leading-tight">{{ subjectName() }}</h1>
            <div class="flex items-center gap-2">
              <span class="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                    [class]="studyType() === 'project'
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                      : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'">
                {{ studyType() === 'project' ? 'Projet' : 'Cours' }}
              </span>
              <span class="text-xs font-bold px-2.5 py-0.5 rounded-full"
                    [class]="isGroup()
                      ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'">
                {{ isGroup() ? '👥 Groupe' : '🔒 Privée' }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- Pomodoro toggle -->
          <button (click)="togglePomodoro()" title="Mode Pomodoro"
                  [class]="pomodoroActive()
                    ? 'px-4 py-2.5 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-bold text-sm flex items-center gap-2'
                    : 'px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-sm flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition'">
            <span class="material-icons text-base">timer</span> Pomodoro
          </button>
          <!-- Sound toggle -->
          <button (click)="soundOn.set(!soundOn())"
                  [class]="soundOn()
                    ? 'w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center'
                    : 'w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition'">
            <span class="material-icons text-base">{{ soundOn() ? 'headphones' : 'headset_off' }}</span>
          </button>
          <!-- Pause -->
          <button (click)="togglePause()"
                  class="px-4 py-2.5 rounded-2xl font-bold text-sm flex items-center gap-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition">
            <span class="material-icons text-base">{{ paused() ? 'play_arrow' : 'pause' }}</span>
            {{ paused() ? 'Reprendre' : 'Pause' }}
          </button>
          <button (click)="pauseAndLeave()"
                  class="px-4 py-2.5 rounded-2xl font-bold text-sm flex items-center gap-2 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition">
            <span class="material-icons text-base">exit_to_app</span> Quitter
          </button>
          <!-- Stop -->
          <button (click)="stopSession()"
                  class="px-5 py-2.5 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition shadow-lg shadow-rose-200 flex items-center gap-2">
            <span class="material-icons text-base">stop</span> Terminer
          </button>
        </div>
      </header>

      <!-- ===================== BODY ===================== -->
      <div class="flex-1 flex gap-5 p-5 min-h-0 overflow-hidden">

        <!-- LEFT: Timer + status + ambient message -->
        <div class="w-64 flex-shrink-0 flex flex-col gap-4">

          <!-- COMPACT TIMER -->
          <div class="bg-white dark:bg-slate-900 rounded-2xl px-5 py-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 [class]="paused() ? 'bg-amber-100 dark:bg-amber-950' : pomodoroActive() ? 'bg-rose-100 dark:bg-rose-950' : 'bg-indigo-100 dark:bg-indigo-950'">
              <span class="material-icons text-lg" [class]="paused() ? 'text-amber-500' : pomodoroActive() ? 'text-rose-500' : 'text-indigo-500'">
                {{ paused() ? 'pause' : 'timer' }}
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ pomodoroActive() ? 'Pomodoro · Cycle ' + pomodoroCount() + '/4' : paused() ? 'En pause' : 'Durée' }}</p>
              <p class="text-2xl font-black font-mono text-slate-900 dark:text-white leading-tight tracking-wider">{{ timer() }}</p>
            </div>
          </div>

          <!-- Ambient sound status -->
          @if (soundOn()) {
            <div class="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-center gap-3">
              <span class="material-icons text-emerald-500 animate-pulse">graphic_eq</span>
              <div>
                <p class="text-sm font-bold text-emerald-700 dark:text-emerald-400">Lofi en cours</p>
                <p class="text-xs text-emerald-600 dark:text-emerald-500">Focus · Chill Beats</p>
              </div>
            </div>
          }

          <!-- Objectifs pré-définis -->
          @if (session()?.objectives?.length) {
            <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h4 class="text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Objectifs</h4>
              <ul class="space-y-1.5">
                @for (obj of session()!.objectives!; track obj) {
                  <li class="flex items-start gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                    <span class="material-icons text-[12px] text-indigo-400 mt-0.5 flex-shrink-0">check_circle_outline</span>
                    {{ obj }}
                  </li>
                }
              </ul>
            </div>
          }

          <!-- Note personnelle / objectif libre -->
          <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex-1">
            <h4 class="text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Note personnelle</h4>
            <textarea [(ngModel)]="sessionGoal"
                      class="w-full h-full min-h-[80px] bg-transparent resize-none focus:outline-none text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400"
                      placeholder="Qu'est-ce que vous voulez accomplir ?"></textarea>
          </div>
        </div>

        <!-- CENTER: Dynamic main workspace -->
        <div class="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden min-h-0">

          <!-- Tab Bar -->
          <div class="flex border-b border-slate-100 dark:border-slate-800 px-6 pt-4 gap-1 flex-shrink-0">
            @for (tab of activeTabs(); track tab.id) {
              <button (click)="activeTab.set(tab.id)"
                      [class]="activeTab() === tab.id
                        ? 'flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 -mb-px bg-indigo-50/50 dark:bg-indigo-950/30'
                        : 'flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition'">
                <span class="material-icons text-base">{{ tab.icon }}</span>
                {{ tab.label }}
              </button>
            }
          </div>

          <!-- TAB CONTENT -->
          <div class="flex-1 overflow-y-auto p-6 min-h-0">

            <!-- ── NOTES ── -->
            @if (activeTab() === 'notes') {
              <div class="flex flex-col gap-4">
                <!-- Header -->
                <div class="flex justify-between items-center">
                  <div>
                    <h3 class="text-lg font-black text-slate-900 dark:text-white">Notes de Session</h3>
                    @if (isGroup()) {
                      <p class="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <span class="material-icons text-[12px]">group</span>
                        Partagées avec tous les membres du groupe
                      </p>
                    }
                  </div>
                </div>

                <!-- Formulaire d'ajout de note -->
                <form (ngSubmit)="addNote()" class="flex flex-col gap-2 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                  <textarea [(ngModel)]="newNoteText" name="noteText" rows="3"
                            placeholder="Ajouter une note (résumé, point clé, définition…)"
                            class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white placeholder-slate-400"></textarea>
                  <div class="flex justify-end">
                    <button type="submit"
                            class="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition shadow-sm shadow-indigo-200">
                      <span class="material-icons text-base">add</span> Ajouter la note
                    </button>
                  </div>
                </form>

                <!-- Liste des notes -->
                @if (sessionNotes().length === 0) {
                  <div class="flex flex-col items-center justify-center py-12 text-slate-400">
                    <span class="material-icons text-5xl mb-3 opacity-30">edit_note</span>
                    <p class="font-bold text-sm">Aucune note pour l'instant.</p>
                    <p class="text-xs mt-1">{{ isGroup() ? 'Tous les membres peuvent ajouter des notes.' : 'Ajoutez vos premières notes.' }}</p>
                  </div>
                } @else {
                  <div class="space-y-3">
                    @for (note of sessionNotes(); track note.id) {
                      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 group">
                        <div class="flex items-start gap-3">
                          <!-- Avatar / Icône -->
                          <img [src]="'https://api.dicebear.com/7.x/avataaars/svg?seed=' + note.authorName"
                               class="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 flex-shrink-0 mt-0.5" />
                          <div class="flex-1 min-w-0">
                            <!-- Auteur + heure -->
                            <div class="flex items-center gap-2 mb-1.5">
                              <span class="text-xs font-black text-indigo-600 dark:text-indigo-400">{{ note.authorName }}</span>
                              @if (note.authorId === auth.currentUser()?.id) {
                                <span class="text-[9px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-500 dark:text-indigo-400 px-1.5 py-0.5 rounded-full">Vous</span>
                              }
                              <span class="text-[10px] text-slate-400 ml-auto">{{ note.createdAt }}</span>
                            </div>
                            <!-- Contenu -->
                            <p class="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{{ note.text }}</p>
                          </div>
                          <!-- Supprimer (seulement son auteur) -->
                          @if (note.authorId === auth.currentUser()?.id) {
                            <button (click)="removeNote(note.id)"
                                    class="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 transition flex-shrink-0 ml-1">
                              <span class="material-icons text-sm">delete</span>
                            </button>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }

            <!-- ── COURS (Matériaux de cours) ── -->
            @if (activeTab() === 'cours') {
              <div class="flex flex-col gap-5">
                <div class="flex justify-between items-center">
                  <h3 class="text-lg font-black text-slate-900 dark:text-white">Matériaux du Cours</h3>
                  <button (click)="addCourseItem()" class="bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-200 transition">
                    <span class="material-icons text-base">add</span> Ajouter
                  </button>
                </div>
                @if (courseItems().length === 0) {
                  <div class="flex flex-col items-center justify-center py-16 text-slate-400">
                    <span class="material-icons text-5xl mb-3 opacity-40">library_books</span>
                    <p class="font-bold text-sm">Aucun matériau ajouté.</p>
                    <p class="text-xs mt-1">Ajoutez des chapitres, définitions ou références.</p>
                  </div>
                } @else {
                  <div class="space-y-3">
                    @for (item of courseItems(); track item.id) {
                      <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 group">
                        <div class="flex items-start gap-3">
                          <div class="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                               [class]="item.type === 'definition' ? 'bg-violet-100 dark:bg-violet-950' : item.type === 'formula' ? 'bg-emerald-100 dark:bg-emerald-950' : 'bg-blue-100 dark:bg-blue-950'">
                            <span class="material-icons text-sm" [class]="item.type === 'definition' ? 'text-violet-600' : item.type === 'formula' ? 'text-emerald-600' : 'text-blue-600'">
                              {{ item.type === 'definition' ? 'format_quote' : item.type === 'formula' ? 'functions' : 'bookmark' }}
                            </span>
                          </div>
                          <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1">
                              <span class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                                    [class]="item.type === 'definition' ? 'bg-violet-100 dark:bg-violet-950 text-violet-600' : item.type === 'formula' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600' : 'bg-blue-100 dark:bg-blue-950 text-blue-600'">
                                {{ item.type === 'definition' ? 'Définition' : item.type === 'formula' ? 'Formule' : 'Référence' }}
                              </span>
                            </div>
                            <p class="font-bold text-slate-900 dark:text-white text-sm mb-1">{{ item.title }}</p>
                            @if (item.content) {
                              <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{{ item.content }}</p>
                            }
                            @if (item.authorName) {
                              <p class="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 flex items-center gap-1">
                                <span class="material-icons text-[10px]">person</span>
                                Ajouté par {{ item.authorName }}
                              </p>
                            }
                          </div>
                          <button (click)="removeCourseItem(item.id)" class="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 transition flex-shrink-0">
                            <span class="material-icons text-sm">delete</span>
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }

            <!-- ── ATTACHMENTS ── -->
            @if (activeTab() === 'attachments') {
              <div class="flex flex-col gap-5">
                <div class="flex justify-between items-center">
                  <h3 class="text-lg font-black text-slate-900 dark:text-white">Pièces Jointes</h3>
                </div>
                <!-- Drop zone -->
                <div class="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition group"
                     (click)="triggerFileInput()">
                  <span class="material-icons text-4xl text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 transition mb-3">cloud_upload</span>
                  <p class="font-bold text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">Glissez-déposez ou cliquez pour ajouter</p>
                  <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">PDF, Images, Docs, Archives</p>
                  <input #fileInputRef type="file" multiple class="hidden" (change)="onFilesSelected($event)" />
                </div>
                @if (attachments().length === 0) {
                  <div class="flex flex-col items-center py-6 text-slate-400">
                    <span class="material-icons text-4xl mb-2 opacity-30">attach_file</span>
                    <p class="text-sm">Aucun fichier joint.</p>
                  </div>
                } @else {
                  <div class="space-y-2">
                    @for (f of attachments(); track f.id) {
                      <div class="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 group transition">
                        <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                             [class]="fileIconBg(f.name)">
                          <span class="material-icons text-base" [class]="fileIconColor(f.name)">{{ fileIcon(f.name) }}</span>
                        </div>
                        <div class="flex-1 min-w-0">
                          <p class="font-bold text-slate-900 dark:text-white text-sm truncate">{{ f.name }}</p>
                          <p class="text-xs text-slate-400">{{ f.size }}</p>
                        </div>
                        <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                          <button (click)="openAttachment(f); $event.stopPropagation()"
                                  class="p-1.5 rounded-lg text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition"
                                  title="Ouvrir">
                            <span class="material-icons text-sm">open_in_new</span>
                          </button>
                          <button (click)="removeAttachment(f.id)" class="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition">
                            <span class="material-icons text-sm">delete</span>
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }

            <!-- ── FLASHCARDS ── (Cours uniquement) -->
            @if (activeTab() === 'flashcards') {
              <div class="h-full flex flex-col items-center gap-6">
                <div class="flex justify-between items-center w-full">
                  <h3 class="text-lg font-black text-slate-900 dark:text-white">Flashcards</h3>
                  <div class="flex gap-2">
                    <button (click)="addFlashcard()" class="bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-200 dark:hover:bg-indigo-900 transition">
                      <span class="material-icons text-base">add</span> Nouvelle carte
                    </button>
                  </div>
                </div>

                @if (flashcards().length === 0) {
                  <div class="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <span class="material-icons text-5xl mb-3 opacity-40">style</span>
                    <p class="font-bold">Aucune flashcard. Créez-en une !</p>
                  </div>
                } @else {
                  <!-- Current card display -->
                  <div class="w-full max-w-lg">
                    <div class="relative bg-gradient-to-br from-indigo-500 to-violet-600 rounded-3xl p-8 shadow-2xl shadow-indigo-200 dark:shadow-indigo-900 cursor-pointer min-h-[200px] flex flex-col items-center justify-center text-center"
                         (click)="flipCard()">
                      @if (!showAnswer()) {
                        <p class="text-xs font-black text-white/60 uppercase tracking-widest mb-4">QUESTION</p>
                        <p class="text-2xl font-black text-white">{{ flashcards()[currentCard()].question }}</p>
                        <p class="text-white/60 text-sm mt-4">Cliquez pour voir la réponse →</p>
                      } @else {
                        <p class="text-xs font-black text-white/60 uppercase tracking-widest mb-4">RÉPONSE</p>
                        <p class="text-xl font-bold text-white">{{ flashcards()[currentCard()].answer }}</p>
                      }
                    </div>
                    <div class="flex justify-between items-center mt-4">
                      <button (click)="prevCard()" class="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400">
                        <span class="material-icons">chevron_left</span>
                      </button>
                      <span class="text-sm font-bold text-slate-500">{{ currentCard() + 1 }} / {{ flashcards().length }}</span>
                      <button (click)="nextCard()" class="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400">
                        <span class="material-icons">chevron_right</span>
                      </button>
                    </div>
                  </div>

                  <!-- card list -->
                  <div class="w-full space-y-2 mt-2">
                    @for (fc of flashcards(); track fc.id; let i = $index) {
                      <div class="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 group">
                        <span class="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-black flex items-center justify-center">{{ i + 1 }}</span>
                        <p class="text-sm text-slate-700 dark:text-slate-300 font-medium flex-1 truncate">{{ fc.question }}</p>
                        <button (click)="removeFlashcard(i)" class="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 transition">
                          <span class="material-icons text-sm">delete</span>
                        </button>
                      </div>
                    }
                  </div>
                }
              </div>
            }

            <!-- ── TODO ── (Projet privé) -->
            @if (activeTab() === 'todo') {
              <div class="flex flex-col gap-4">
                <div class="flex justify-between items-center">
                  <h3 class="text-lg font-black text-slate-900 dark:text-white">Tâches de Session</h3>
                  <span class="text-sm font-bold text-slate-500">{{ doneCount() }}/{{ todos().length }} terminées</span>
                </div>
                <!-- Progress -->
                <div class="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div class="h-full bg-amber-500 rounded-full transition-all duration-500"
                       [style.width.%]="todos().length > 0 ? (doneCount() / todos().length * 100) : 0"></div>
                </div>
                <!-- Add task -->
                <form (ngSubmit)="addTodo()" class="flex gap-2">
                  <input [(ngModel)]="newTodo" name="todo" type="text" placeholder="Ajouter une tâche..."
                         class="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition dark:text-white" />
                  <button type="submit" class="bg-amber-500 text-white px-5 py-3 rounded-2xl font-bold hover:bg-amber-600 transition">
                    <span class="material-icons text-base">add</span>
                  </button>
                </form>
                <!-- Task list -->
                <div class="space-y-2">
                  @for (t of todos(); track t.id) {
                    <label class="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer group transition">
                      <input type="checkbox" [(ngModel)]="t.done" name="{{ t.id }}"
                             class="w-5 h-5 accent-amber-500 rounded flex-shrink-0" />
                      <span class="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200"
                            [class.line-through]="t.done" [class.opacity-50]="t.done">{{ t.text }}</span>
                      <button (click)="removeTodo(t.id)" class="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 transition flex-shrink-0">
                        <span class="material-icons text-base">close</span>
                      </button>
                    </label>
                  }
                </div>
              </div>
            }

            <!-- ── KANBAN ── (Projet groupe) -->
            @if (activeTab() === 'kanban') {
              <div class="flex flex-col gap-4 h-full">
                <div class="flex justify-between items-center">
                  <h3 class="text-lg font-black text-slate-900 dark:text-white">Kanban Collaboratif</h3>
                  <button (click)="addKanbanCard()" class="bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-amber-200 transition">
                    <span class="material-icons text-base">add</span> Tâche
                  </button>
                </div>
                <div class="grid grid-cols-3 gap-4 flex-1 min-h-0">
                  @for (col of kanbanCols; track col.id) {
                    <div class="bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3 min-h-[200px]">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="w-2 h-2 rounded-full" [class]="col.dotColor"></span>
                        <h4 class="text-xs font-black text-slate-500 uppercase tracking-wider">{{ col.label }}</h4>
                        <span class="ml-auto text-xs bg-slate-200 dark:bg-slate-700 text-slate-500 rounded-full px-2 py-0.5 font-bold">
                          {{ getColCards(col.id).length }}
                        </span>
                      </div>
                      @for (card of getColCards(col.id); track card.id) {
                        <div class="bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 group cursor-grab">
                          <p class="text-sm font-semibold text-slate-800 dark:text-white mb-2">{{ card.text }}</p>
                          <div class="flex gap-1">
                            @if (col.id !== 'todo') {
                              <button (click)="moveCard(card.id, 'todo')" class="text-[10px] text-slate-400 hover:text-slate-700 font-bold px-2 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">← À faire</button>
                            }
                            @if (col.id !== 'doing') {
                              <button (click)="moveCard(card.id, 'doing')" class="text-[10px] text-slate-400 hover:text-indigo-600 font-bold px-2 py-0.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950 transition">En cours</button>
                            }
                            @if (col.id !== 'done') {
                              <button (click)="moveCard(card.id, 'done')" class="text-[10px] text-slate-400 hover:text-emerald-600 font-bold px-2 py-0.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950 transition">Fait ✓</button>
                            }
                            <button (click)="removeCard(card.id)" class="text-[10px] text-rose-300 hover:text-rose-600 font-bold px-2 py-0.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 transition ml-auto">×</button>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            }

            <!-- ── CHAT ── (Groupe uniquement) -->
            @if (activeTab() === 'chat') {
              <div class="flex flex-col h-full gap-3">
                <div class="flex items-center gap-2">
                  <span class="material-icons text-indigo-500 text-base">forum</span>
                  <h3 class="text-base font-black text-slate-900 dark:text-white">Chat de session</h3>
                  <span class="text-xs text-slate-400 font-medium ml-auto">Visible par les membres du groupe</span>
                </div>
                <!-- Messages -->
                <div class="flex-1 space-y-3 overflow-y-auto pr-1 min-h-[200px] max-h-[340px]">
                  @if (chatMessages().length === 0) {
                    <div class="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-600">
                      <span class="material-icons text-4xl mb-2">chat_bubble_outline</span>
                      <p class="text-sm font-medium">Aucun message pour l'instant.</p>
                      <p class="text-xs">Soyez le premier à écrire !</p>
                    </div>
                  }
                  @for (msg of chatMessages(); track msg.id) {
                    @if (msg.senderId === auth.currentUser()?.id) {
                      <!-- Message de l'utilisateur courant (droite) -->
                      <div class="flex gap-2 justify-end">
                        <div class="flex flex-col items-end max-w-[75%]">
                          <div class="bg-indigo-600 text-white rounded-3xl rounded-tr-sm px-4 py-2.5">
                            <p class="text-sm font-medium">{{ msg.text }}</p>
                          </div>
                          <p class="text-[10px] text-slate-400 mt-1 pr-1">{{ msg.time }}</p>
                        </div>
                        <img [src]="'https://api.dicebear.com/7.x/avataaars/svg?seed=' + msg.senderName"
                             class="w-8 h-8 rounded-full bg-indigo-100 flex-shrink-0 self-end" />
                      </div>
                    } @else {
                      <!-- Message d'un autre membre (gauche) -->
                      <div class="flex gap-2">
                        <img [src]="'https://api.dicebear.com/7.x/avataaars/svg?seed=' + msg.senderName"
                             class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex-shrink-0 self-end" />
                        <div class="flex flex-col max-w-[75%]">
                          <p class="text-[10px] text-slate-500 font-bold mb-1 pl-1">{{ msg.senderName }}</p>
                          <div class="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-3xl rounded-tl-sm px-4 py-2.5">
                            <p class="text-sm font-medium">{{ msg.text }}</p>
                          </div>
                          <p class="text-[10px] text-slate-400 mt-1 pl-1">{{ msg.time }}</p>
                        </div>
                      </div>
                    }
                  }
                </div>
                <!-- Input -->
                <form (ngSubmit)="sendMessage()" class="flex gap-2 mt-auto">
                  <input [(ngModel)]="newMessage" name="msg" type="text" placeholder="Écrivez un message…"
                         class="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white" />
                  <button type="submit" class="bg-indigo-600 text-white px-5 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition">
                    <span class="material-icons text-base">send</span>
                  </button>
                </form>
              </div>
            }

          </div>
        </div>

        <!-- RIGHT: Quick links / Session info -->
        <div class="w-52 flex-shrink-0 flex flex-col gap-4">
          <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Infos</h4>
            <div class="space-y-3 text-sm">
              <div class="flex justify-between">
                <span class="text-slate-500">Début</span>
                <span class="font-bold text-slate-900 dark:text-white">{{ sessionStart() }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">Fin prévue</span>
                <span class="font-bold text-slate-900 dark:text-white">{{ sessionEnd() }}</span>
              </div>
            </div>
          </div>

          <!-- Liens rapides -->
          <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex-1">
            <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Ressources</h4>
            @if (isGroup()) {
              <p class="text-[10px] text-slate-400 mb-3 flex items-center gap-1">
                <span class="material-icons text-[10px]">group</span> Partagés avec le groupe
              </p>
            }
            <div class="space-y-1.5">
              @for (link of quickLinks(); track link.id) {
                <div class="flex items-center gap-1 group">
                  <a [href]="link.url" target="_blank"
                     class="flex items-center gap-2 flex-1 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition text-sm font-medium text-slate-700 dark:text-slate-300 min-w-0">
                    <span class="material-icons text-base text-slate-400 group-hover:text-indigo-500 transition flex-shrink-0">link</span>
                    <span class="truncate text-xs">{{ link.label }}</span>
                  </a>
                  <button (click)="removeLink(link.id)"
                          class="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 transition flex-shrink-0 p-1">
                    <span class="material-icons text-xs">close</span>
                  </button>
                </div>
              }
            </div>
            <form (ngSubmit)="addLink()" class="mt-3 flex flex-col gap-1.5">
              <input [(ngModel)]="newLinkLabel" name="linklabel" type="text" placeholder="Nom du lien"
                     class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:text-white" />
              <div class="flex gap-1">
                <input [(ngModel)]="newLinkUrl" name="linkurl" type="url" placeholder="https://..."
                       class="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:text-white" />
                <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold transition">+</button>
              </div>
            </form>
          </div>
        </div>

      </div>

      <!-- ===================== FLASHCARD CREATION MODAL ===================== -->
      @if (showFlashcardModal()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-60 flex items-center justify-center" (click)="showFlashcardModal.set(false)">
          <form (ngSubmit)="saveFlashcard()" (click)="$event.stopPropagation()"
                class="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 w-full max-w-sm mx-4 border border-slate-200 dark:border-slate-700">
            <h3 class="text-xl font-black text-slate-900 dark:text-white mb-6">Nouvelle Flashcard</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Question</label>
                <textarea [(ngModel)]="newCard.question" name="q" rows="2"
                          class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"></textarea>
              </div>
              <div>
                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Réponse</label>
                <textarea [(ngModel)]="newCard.answer" name="a" rows="3"
                          class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"></textarea>
              </div>
            </div>
            <div class="flex justify-between mt-6">
              <button type="button" (click)="showFlashcardModal.set(false)" class="text-slate-500 font-bold">Annuler</button>
              <button type="submit" class="bg-indigo-600 text-white px-6 py-2.5 rounded-2xl font-bold hover:bg-indigo-700 transition">Ajouter</button>
            </div>
          </form>
        </div>
      }

      <!-- ===================== KANBAN CARD MODAL ===================== -->
      @if (showKanbanModal()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-60 flex items-center justify-center" (click)="showKanbanModal.set(false)">
          <form (ngSubmit)="saveKanbanCard()" (click)="$event.stopPropagation()"
                class="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 w-full max-w-sm mx-4 border border-slate-200 dark:border-slate-700">
            <h3 class="text-xl font-black text-slate-900 dark:text-white mb-6">Nouvelle Tâche Kanban</h3>
            <textarea [(ngModel)]="newKanbanText" name="kt" rows="3" placeholder="Description de la tâche..."
                      class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 dark:text-white mb-6"></textarea>
            <div class="flex justify-between">
              <button type="button" (click)="showKanbanModal.set(false)" class="text-slate-500 font-bold">Annuler</button>
              <button type="submit" class="bg-amber-500 text-white px-6 py-2.5 rounded-2xl font-bold hover:bg-amber-600 transition">Ajouter</button>
            </div>
          </form>
        </div>
      }

      <!-- ===================== COURSE ITEM MODAL ===================== -->
      @if (showCourseModal()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-60 flex items-center justify-center" (click)="showCourseModal.set(false)">
          <form (ngSubmit)="saveCourseItem()" (click)="$event.stopPropagation()"
                class="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 w-full max-w-sm mx-4 border border-slate-200 dark:border-slate-700">
            <h3 class="text-xl font-black text-slate-900 dark:text-white mb-5">Ajouter un Matériau</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Type</label>
                <div class="flex gap-2">
                  <button type="button" (click)="newCourseItem.type = 'definition'"
                          [class]="newCourseItem.type === 'definition' ? 'flex-1 py-2 rounded-xl border-2 border-violet-500 bg-violet-50 dark:bg-violet-950 text-violet-600 font-bold text-xs' : 'flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition'">
                    Définition
                  </button>
                  <button type="button" (click)="newCourseItem.type = 'formula'"
                          [class]="newCourseItem.type === 'formula' ? 'flex-1 py-2 rounded-xl border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 font-bold text-xs' : 'flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition'">
                    Formule
                  </button>
                  <button type="button" (click)="newCourseItem.type = 'reference'"
                          [class]="newCourseItem.type === 'reference' ? 'flex-1 py-2 rounded-xl border-2 border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-600 font-bold text-xs' : 'flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition'">
                    Référence
                  </button>
                </div>
              </div>
              <div>
                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Titre</label>
                <input [(ngModel)]="newCourseItem.title" name="ctitle" type="text" placeholder="Ex: Théorème de Pythagore"
                       class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white" />
              </div>
              <div>
                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Contenu</label>
                <textarea [(ngModel)]="newCourseItem.content" name="ccontent" rows="3"
                          placeholder="Définition, formule, ou explication..."
                          class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"></textarea>
              </div>
            </div>
            <div class="flex justify-between mt-6">
              <button type="button" (click)="showCourseModal.set(false)" class="text-slate-500 font-bold">Annuler</button>
              <button type="submit" class="bg-indigo-600 text-white px-6 py-2.5 rounded-2xl font-bold hover:bg-indigo-700 transition">Ajouter</button>
            </div>
          </form>
        </div>
      }
    </div>
  `
})
export class ActiveSessionPageComponent implements OnInit, OnDestroy {
  router   = inject(Router);
  planning = inject(PlanningService);
  toast    = inject(ToastService);
  socket   = inject(SocketService);
  auth     = inject(AuthService);

  private sessionChatSub?: Subscription;
  private sessionHistorySub?: Subscription;
  private sessionNotesSub?: Subscription;
  private sessionNotesHistorySub?: Subscription;
  private sessionCourseItemAddedSub?: Subscription;
  private sessionCourseItemRemovedSub?: Subscription;
  private sessionAttachmentAddedSub?: Subscription;
  private sessionAttachmentRemovedSub?: Subscription;
  private sessionLinkAddedSub?: Subscription;
  private sessionLinkRemovedSub?: Subscription;

  // ── Session data ─────────────────────────────────────────────
  session   = computed(() => this.planning.activeSession());
  subject   = computed(() => this.planning.subjects().find(s => s.id === this.session()?.subjectId));
  studyType = computed(() => this.subject()?.studyType ?? 'course');
  isGroup   = computed(() => !!(this.session() as any)?.isGroupSession || !!(this.session() as any)?.groupSession);
  subjectName  = computed(() => {
    const name = this.subject()?.name;
    if (name) return name;
    const t = (this.session() as any)?.title;
    return (t && t.trim()) ? t : 'Session';
  });
  subjectColor = computed(() => this.subject()?.color ?? '#6366f1');

  sessionStart = computed(() => {
    const s = this.session(); return s ? this.fmt(s.startTime) : '--:--';
  });
  sessionEnd = computed(() => {
    const s = this.session(); return s ? this.fmt(s.endTime) : '--:--';
  });

  // ── Timer ────────────────────────────────────────────────────
  timer = signal('00:00:00');
  paused = signal(false);
  private intervalId: any;
  private elapsed = 0;

  // ── Pomodoro ─────────────────────────────────────────────────
  pomodoroActive = signal(false);
  pomodoroCount  = signal(1);
  private pomodoroSecs = 0;

  // ── Sound & UI ───────────────────────────────────────────────
  soundOn = signal(false);

  // ── Tabs ─────────────────────────────────────────────────────
  activeTab = signal('notes');
  activeTabs = computed(() => {
    const tabs = [{ id: 'notes', label: 'Notes', icon: 'edit_document' }];
    if (this.studyType() === 'course')
      tabs.push({ id: 'cours', label: 'Cours', icon: 'library_books' });
    if (this.studyType() === 'course' && !this.isGroup())
      tabs.push({ id: 'flashcards', label: 'Flashcards', icon: 'style' });
    if (this.studyType() === 'project' && !this.isGroup())
      tabs.push({ id: 'todo', label: 'To-Do', icon: 'checklist' });
    if (this.studyType() === 'project' && this.isGroup())
      tabs.push({ id: 'kanban', label: 'Kanban', icon: 'view_kanban' });
    if (this.isGroup())
      tabs.push({ id: 'chat', label: 'Chat', icon: 'forum' });
    tabs.push({ id: 'attachments', label: 'Pièces jointes', icon: 'attach_file' });
    return tabs;
  });

  // ── Notes ────────────────────────────────────────────────────
  notes       = '';
  sessionGoal = '';

  // ── Flashcards ───────────────────────────────────────────────
  flashcards    = signal<{ id: string; question: string; answer: string }[]>([]);
  currentCard   = signal(0);
  showAnswer    = signal(false);
  showFlashcardModal = signal(false);
  newCard = { question: '', answer: '' };

  // ── Todo ─────────────────────────────────────────────────────
  todos    = signal<TodoItem[]>([]);
  newTodo  = '';
  doneCount = computed(() => this.todos().filter(t => t.done).length);

  // ── Kanban ───────────────────────────────────────────────────
  kanbanCards     = signal<KanbanCard[]>([]);
  showKanbanModal = signal(false);
  newKanbanText   = '';
  kanbanCols = [
    { id: 'todo'  as const, label: 'À Faire',  dotColor: 'bg-slate-400' },
    { id: 'doing' as const, label: 'En Cours', dotColor: 'bg-amber-400' },
    { id: 'done'  as const, label: 'Terminé',  dotColor: 'bg-emerald-500' },
  ];
  getColCards(col: string) { return this.kanbanCards().filter(c => c.col === col); }

  // ── Notes partagées ──────────────────────────────────────────
  sessionNotes = signal<SessionNote[]>([]);
  newNoteText = '';

  // ── Chat ─────────────────────────────────────────────────────
  chatMessages = signal<ChatMessage[]>([]);
  newMessage = '';

  // ── Quick Links ──────────────────────────────────────────────
  quickLinks  = signal<{ id: string; label: string; url: string }[]>([
    { id: 'github', label: 'GitHub',   url: 'https://github.com' },
    { id: 'drive',  label: 'Drive',    url: 'https://drive.google.com' },
  ]);
  newLinkLabel = '';
  newLinkUrl   = '';

  // ── Course Items ─────────────────────────────────────────────
  courseItems = signal<CourseItem[]>([]);
  showCourseModal = signal(false);
  newCourseItem = { type: 'definition' as 'definition' | 'formula' | 'reference', title: '', content: '' };

  // ── Attachments ───────────────────────────────────────────────
  attachments = signal<{ id: string; name: string; size: string; dataUrl?: string; mimeType?: string }[]>([]); 

  // ─────────────────────────────────────────────────────────────
  ngOnInit() {
    // Attendre un tick pour laisser le temps à stopSessionHttp de s'exécuter
    setTimeout(() => {
      if (!this.planning.activeId()) {
        this.router.navigate(['/app/planning']);
        return;
      }
      this.hydrateFromCurrentSession();
      const existingSeconds = this.session()?.pausedElapsedSeconds
        ?? ((this.session()?.actualDurationMinutes ?? 0) * 60);
      this.elapsed = Math.max(0, existingSeconds);
      this.refreshTimerLabel();
      this.startTimer();
      // Rejoindre la room socket si session de groupe
      if (this.isGroup()) {
        this.joinSessionChat();
      }
    }, 0);
  }

  private hydrateFromCurrentSession() {
    const s = this.session();
    if (!s) return;
    this.notes = s.note ?? '';
    this.sessionGoal = s.sessionGoal ?? '';
    this.todos.set((s.todos ?? []).map(t => ({ id: t.id, text: t.text, done: !!t.done, authorName: t.authorName })));
    this.flashcards.set((s.flashcards ?? []).map(f => ({ id: f.id, question: f.question, answer: f.answer })));
    this.courseItems.set((s.courseItems ?? []).map(c => ({
      id: c.id,
      type: (c.type === 'definition' || c.type === 'formula' || c.type === 'reference') ? c.type : 'reference',
      title: c.title,
      content: c.content,
      authorName: c.authorName,
    })));
    this.attachments.set((s.attachments ?? []).map(a => ({
      id: a.id,
      name: a.name,
      size: a.size,
      dataUrl: a.dataUrl,
      mimeType: a.mimeType,
    })));
  }

  ngOnDestroy(): void {
    // Quitter la room socket du chat de session
    if (this.isGroup()) {
      this.leaveSessionChat();
    }
    // Sauvegarde automatique si l'utilisateur navigue sans cliquer "Pause"
    clearInterval(this.intervalId);
    const sessionId = this.planning.activeId();
    if (sessionId && this.elapsed > 0) {
      this.planning.pauseActiveSessionHttp(sessionId, this.elapsed);
    }
  }

  startTimer() {
    this.intervalId = setInterval(() => {
      if (this.paused()) return;
      this.elapsed++;
      if (this.pomodoroActive()) {
        this.pomodoroSecs++;
        if (this.pomodoroSecs >= 25 * 60) {
          this.pomodoroSecs = 0;
          this.pomodoroCount.update(n => Math.min(n + 1, 4));
        }
      }
      const h = Math.floor(this.elapsed / 3600);
      const m = Math.floor((this.elapsed % 3600) / 60);
      const s = this.elapsed % 60;
      this.timer.set(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    }, 1000);
  }

  private refreshTimerLabel() {
    const h = Math.floor(this.elapsed / 3600);
    const m = Math.floor((this.elapsed % 3600) / 60);
    const s = this.elapsed % 60;
    this.timer.set(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
  }

  togglePause() {
    const next = !this.paused();
    this.paused.set(next);
  }

  pauseAndLeave() {
    const sessionId = this.session()?.id;
    if (!sessionId) return;
    this.paused.set(true);
    const sessionData = {
      note:        this.notes.trim() || undefined,
      sessionGoal: this.sessionGoal.trim() || undefined,
      todos:       this.todos().map(t => ({ id: t.id, text: t.text, done: t.done, authorName: t.authorName })),
      flashcards:  this.flashcards().map(f => ({ id: f.id, question: f.question, answer: f.answer })),
      courseItems: this.courseItems().map(c => ({ id: c.id, type: c.type, title: c.title, content: c.content, authorName: c.authorName })),
      attachments: this.attachments().map(a => ({
        id: a.id,
        name: a.name,
        size: a.size,
        dataUrl: a.dataUrl,
        mimeType: a.mimeType,
      })),
    };
    this.planning.pauseAndSaveSessionHttp(sessionId, this.elapsed, sessionData);
    this.toast.show('Session mise en pause. Vous pouvez la reprendre plus tard.', 'info');
    this.router.navigate(['/app/sessions']);
  }

  togglePomodoro() {
    this.pomodoroActive.set(!this.pomodoroActive());
    if (this.pomodoroActive()) { this.pomodoroSecs = 0; this.pomodoroCount.set(1); }
  }

  stopSession() {
    const activeId = this.planning.activeId();
    if (!activeId) return;

    // Construire les données à sauvegarder
    const sessionData = {
      note:        this.notes.trim() || undefined,
      sessionGoal: this.sessionGoal.trim() || undefined,
      todos:       this.todos().map(t => ({ id: t.id, text: t.text, done: t.done, authorName: t.authorName })),
      flashcards:  this.flashcards().map(f => ({ id: f.id, question: f.question, answer: f.answer })),
      courseItems: this.courseItems().map(c => ({ id: c.id, type: c.type, title: c.title, content: c.content, authorName: c.authorName })),
      attachments: this.attachments().map(a => ({
        id: a.id,
        name: a.name,
        size: a.size,
        dataUrl: a.dataUrl,
        mimeType: a.mimeType,
      })),
    };

    // Sauvegarder les données puis stopper
    this.planning.saveSessionDataAndStop(activeId, sessionData);
    this.router.navigate(['/app/sessions']);
  }

  // Notes partagées
  addNote() {
    const text = this.newNoteText.trim();
    if (!text) return;
    if (this.isGroup()) {
      // Session de groupe : persistance via Socket.IO → backend MongoDB
      this.socket.addSessionNote(text);
    } else {
      // Session personnelle : ajout local uniquement
      const user = this.auth.currentUser();
      const note: SessionNote = {
        id: Date.now().toString(),
        authorId: user?.id ?? '',
        authorName: user?.name ?? 'Moi',
        text,
        createdAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };
      this.sessionNotes.update(n => [...n, note]);
    }
    this.newNoteText = '';
  }

  removeNote(noteId: string) {
    if (this.isGroup()) {
      this.socket.removeSessionNote(noteId);
    } else {
      this.sessionNotes.update(n => n.filter(x => x.id !== noteId));
    }
  }

  // Flashcard methods
  addFlashcard() { this.newCard = { question: '', answer: '' }; this.showFlashcardModal.set(true); }
  saveFlashcard() {
    if (!this.newCard.question.trim()) return;
    this.flashcards.update(f => [...f, { id: Date.now().toString(), ...this.newCard }]);
    this.showFlashcardModal.set(false);
  }
  removeFlashcard(i: number) { this.flashcards.update(f => f.filter((_, n) => n !== i)); }
  flipCard() { this.showAnswer.set(!this.showAnswer()); }
  nextCard() { this.currentCard.update(n => (n + 1) % this.flashcards().length); this.showAnswer.set(false); }
  prevCard() { this.currentCard.update(n => (n - 1 + this.flashcards().length) % this.flashcards().length); this.showAnswer.set(false); }

  // Todo methods
  addTodo() {
    if (!this.newTodo.trim()) return;
    const authorName = this.auth.currentUser()?.name ?? 'Moi';
    this.todos.update(t => [...t, { id: Date.now().toString(), text: this.newTodo.trim(), done: false, authorName }]);
    this.newTodo = '';
    this.autoSave();
  }
  removeTodo(id: string) {
    this.todos.update(t => t.filter(x => x.id !== id));
    this.autoSave();
  }

  // Kanban methods
  addKanbanCard() { this.newKanbanText = ''; this.showKanbanModal.set(true); }
  saveKanbanCard() {
    if (!this.newKanbanText.trim()) return;
    const authorName = this.auth.currentUser()?.name ?? 'Moi';
    this.kanbanCards.update(c => [...c, { id: Date.now().toString(), text: this.newKanbanText.trim(), col: 'todo', authorName }]);
    this.showKanbanModal.set(false);
  }
  moveCard(id: string, col: 'todo' | 'doing' | 'done') {
    this.kanbanCards.update(c => c.map(card => card.id === id ? { ...card, col } : card));
  }
  removeCard(id: string) { this.kanbanCards.update(c => c.filter(x => x.id !== id)); }

  // chatId pour la room partagée : groupId si session de groupe, sinon sessionId
  // Note : Java boolean "groupSession" est sérialisé en "groupSession" par Jackson,
  // on normalise dans loadSessionsFromBackend mais on est défensif ici aussi.
  private get chatId(): string {
    const s = this.session() as any;
    const isGrp = s?.isGroupSession || s?.groupSession;
    return (isGrp && s?.groupId) ? s.groupId : (this.planning.activeId() ?? '');
  }

  // Chat
  sendMessage() {
    const text = this.newMessage.trim();
    if (!text) return;
    this.socket.sendSessionMessage(text);
    this.newMessage = '';
  }

  private joinSessionChat(): void {
    const sessionId = this.planning.activeId();
    const user = this.auth.currentUser();
    if (!sessionId || !user) return;
    const session = this.session();
    const myChatId = this.chatId;

    // ── Historique chat ──────────────────────────────────────────
    this.sessionHistorySub = this.socket.onSessionChatHistory().subscribe(({ chatId, messages }) => {
      if (chatId !== myChatId) return;
      this.chatMessages.set(messages);
    });
    // ── Nouveaux messages chat ───────────────────────────────────
    this.sessionChatSub = this.socket.onSessionMessage().subscribe(({ chatId, message }) => {
      if (chatId !== myChatId) return;
      this.chatMessages.update(list => [...list, message]);
    });

    // ── Historique notes partagées ───────────────────────────────
    this.sessionNotesHistorySub = this.socket.onSessionNotesHistory().subscribe(({ chatId, notes }) => {
      if (chatId !== myChatId) return;
      this.sessionNotes.set(notes);
    });
    // ── Nouvelle note ajoutée ────────────────────────────────────
    this.sessionNotesSub = this.socket.onSessionNoteAdded().subscribe(({ chatId, note }) => {
      if (chatId !== myChatId) return;
      this.sessionNotes.update(n => [...n, note]);
    });
    // ── Note supprimée ───────────────────────────────────────────
    const noteRemovedSub = this.socket.onSessionNoteRemoved().subscribe(({ chatId, noteId }) => {
      if (chatId !== myChatId) return;
      this.sessionNotes.update(n => n.filter(x => x.id !== noteId));
    });

    // ── Cours item ajouté (broadcast depuis le backend) ──────────
    this.sessionCourseItemAddedSub = this.socket.onSessionCourseItemAdded().subscribe(({ chatId, item }) => {
      if (chatId !== myChatId) return;
      // Déduplication par ID : l'émetteur a déjà ajouté l'item localement
      if (this.courseItems().some(c => c.id === item.id)) return;
      const courseItem: CourseItem = {
        id: item.id,
        type: (item.type === 'definition' || item.type === 'formula' || item.type === 'reference') ? item.type : 'reference',
        title: item.title,
        content: item.content,
        authorName: item.authorName,
      };
      this.courseItems.update(c => [...c, courseItem]);
      this.autoSave();
    });

    // ── Cours item supprimé (broadcast depuis le backend) ────────
    this.sessionCourseItemRemovedSub = this.socket.onSessionCourseItemRemoved().subscribe(({ chatId, courseItemId }) => {
      if (chatId !== myChatId) return;
      // L'émetteur a déjà retiré l'item localement, les autres membres le retirent ici
      this.courseItems.update(c => c.filter(x => x.id !== courseItemId));
      this.autoSave();
    });

    // Stocker le sub noteRemoved pour cleanup
    this.sessionNotesSub?.add(noteRemovedSub);

    // ── Pièces jointes ────────────────────────────────────────────
    this.sessionAttachmentAddedSub = this.socket.onSessionAttachmentAdded().subscribe(({ chatId, attachment }) => {
      if (chatId !== myChatId) return;
      if (this.attachments().some(a => a.id === attachment.id)) return;
      this.attachments.update(a => [...a, attachment]);
      this.autoSave(); // Persiste la pièce jointe reçue pour ce membre
    });
    this.sessionAttachmentRemovedSub = this.socket.onSessionAttachmentRemoved().subscribe(({ chatId, id }) => {
      if (chatId !== myChatId) return;
      this.attachments.update(a => a.filter(x => x.id !== id));
      this.autoSave(); // Persiste la suppression pour ce membre
    });

    // ── Liens rapides ─────────────────────────────────────────────
    this.sessionLinkAddedSub = this.socket.onSessionLinkAdded().subscribe(({ chatId, link }) => {
      if (chatId !== myChatId) return;
      if (this.quickLinks().some(l => l.id === link.id)) return;
      this.quickLinks.update(l => [...l, link]);
    });
    this.sessionLinkRemovedSub = this.socket.onSessionLinkRemoved().subscribe(({ chatId, id }) => {
      if (chatId !== myChatId) return;
      this.quickLinks.update(l => l.filter(x => x.id !== id));
    });

    // Rejoindre la room (déclenche les événements history)
    this.socket.joinSession(sessionId, user.id, user.name ?? 'Membre', session?.groupId);
  }

  private leaveSessionChat(): void {
    const sessionId = this.planning.activeId();
    if (sessionId) this.socket.leaveSession(sessionId);
    this.sessionChatSub?.unsubscribe();
    this.sessionChatSub = undefined;
    this.sessionHistorySub?.unsubscribe();
    this.sessionHistorySub = undefined;
    this.sessionNotesSub?.unsubscribe();
    this.sessionNotesSub = undefined;
    this.sessionNotesHistorySub?.unsubscribe();
    this.sessionNotesHistorySub = undefined;
    this.sessionCourseItemAddedSub?.unsubscribe();
    this.sessionCourseItemAddedSub = undefined;
    this.sessionCourseItemRemovedSub?.unsubscribe();
    this.sessionCourseItemRemovedSub = undefined;
    this.sessionAttachmentAddedSub?.unsubscribe();
    this.sessionAttachmentAddedSub = undefined;
    this.sessionAttachmentRemovedSub?.unsubscribe();
    this.sessionAttachmentRemovedSub = undefined;
    this.sessionLinkAddedSub?.unsubscribe();
    this.sessionLinkAddedSub = undefined;
    this.sessionLinkRemovedSub?.unsubscribe();
    this.sessionLinkRemovedSub = undefined;
  }

  // Auto-save : persiste les données en base après chaque mutation
  private autoSave(): void {
    const sessionId = this.planning.activeId();
    if (!sessionId) return;
    this.planning.saveSessionData(sessionId, {
      note:        this.notes.trim() || undefined,
      sessionGoal: this.sessionGoal.trim() || undefined,
      todos:       this.todos().map(t => ({ id: t.id, text: t.text, done: t.done, authorName: t.authorName })),
      flashcards:  this.flashcards().map(f => ({ id: f.id, question: f.question, answer: f.answer })),
      courseItems: this.courseItems().map(c => ({ id: c.id, type: c.type, title: c.title, content: c.content, authorName: c.authorName })),
      attachments: this.attachments().map(a => ({ id: a.id, name: a.name, size: a.size, dataUrl: a.dataUrl, mimeType: a.mimeType })),
    });
  }

  // Quick links
  addLink() {
    if (!this.newLinkLabel.trim()) return;
    const link = {
      id: Date.now().toString(),
      label: this.newLinkLabel.trim(),
      url: this.newLinkUrl.trim() || '#',
    };
    this.quickLinks.update(l => [...l, link]);
    if (this.isGroup()) this.socket.broadcastLinkAdded(link);
    this.newLinkLabel = '';
    this.newLinkUrl   = '';
  }

  removeLink(id: string) {
    this.quickLinks.update(l => l.filter(x => x.id !== id));
    if (this.isGroup()) this.socket.broadcastLinkRemoved(id);
  }

  // Course items
  addCourseItem() { this.newCourseItem = { type: 'definition', title: '', content: '' }; this.showCourseModal.set(true); }
  saveCourseItem() {
    if (!this.newCourseItem.title.trim()) return;
    const authorName = this.auth.currentUser()?.name ?? 'Moi';
    const newItem: CourseItem = { id: Date.now().toString(), ...this.newCourseItem, authorName };
    this.courseItems.update(c => [...c, newItem]);
    this.showCourseModal.set(false);
    // Broadcast aux autres membres du groupe
    if (this.isGroup()) {
      this.socket.broadcastCourseItemAdded(newItem);
    }
    this.autoSave();
  }
  removeCourseItem(id: string) {
    this.courseItems.update(c => c.filter(x => x.id !== id));
    // Broadcast aux autres membres du groupe
    if (this.isGroup()) {
      this.socket.broadcastCourseItemRemoved(id);
    }
    this.autoSave();
  }

  // Attachments
  triggerFileInput() {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (input) input.click();
  }
  onFilesSelected(event: Event) {
    const files = (event.target as HTMLInputElement).files;
    if (!files) return;
    Array.from(files).forEach(f => {
      const reader = new FileReader();
      reader.onload = () => {
        const kb = f.size / 1024;
        const size = kb > 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb.toFixed(0) + ' KB';
        const att = {
          id: Date.now().toString() + Math.random(),
          name: f.name,
          size,
          dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
          mimeType: f.type || undefined,
        };
        this.attachments.update(a => [...a, att]);
        this.autoSave(); // Persiste immédiatement pour l'émetteur
        // Broadcast aux autres membres du groupe
        if (this.isGroup()) this.socket.broadcastAttachmentAdded(att);
      };
      reader.readAsDataURL(f);
    });
  }
  removeAttachment(id: string) {
    this.attachments.update(a => a.filter(x => x.id !== id));
    this.autoSave(); // Persiste la suppression pour l'émetteur
    if (this.isGroup()) this.socket.broadcastAttachmentRemoved(id);
  }
  openAttachment(file: { name: string; dataUrl?: string }) {
    if (!file.dataUrl) {
      this.toast.show(`Fichier "${file.name}" indisponible (pas de lien sauvegardé).`, 'warning');
      return;
    }
    const tab = window.open('', '_blank');
    if (!tab) {
      this.toast.show('Le navigateur a bloqué l’ouverture. Autorisez les popups pour ce site.', 'warning');
      return;
    }
    this.dataUrlToObjectUrl(file.dataUrl)
      .then((objectUrl) => {
        tab.location.href = objectUrl;
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      })
      .catch(() => {
        tab.close();
        this.toast.show(`Impossible d’ouvrir "${file.name}".`, 'error');
      });
  }
  private async dataUrlToObjectUrl(dataUrl: string): Promise<string> {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }
  fileIcon(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    if (['pdf'].includes(ext)) return 'picture_as_pdf';
    if (['jpg','jpeg','png','gif','webp'].includes(ext)) return 'image';
    if (['doc','docx'].includes(ext)) return 'description';
    if (['zip','rar','7z'].includes(ext)) return 'folder_zip';
    return 'insert_drive_file';
  }
  fileIconBg(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    if (['pdf'].includes(ext)) return 'bg-rose-100 dark:bg-rose-950';
    if (['jpg','jpeg','png','gif','webp'].includes(ext)) return 'bg-blue-100 dark:bg-blue-950';
    return 'bg-slate-100 dark:bg-slate-800';
  }
  fileIconColor(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    if (['pdf'].includes(ext)) return 'text-rose-500';
    if (['jpg','jpeg','png','gif','webp'].includes(ext)) return 'text-blue-500';
    return 'text-slate-500';
  }

  // Helpers
  private fmt(d: Date): string {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  private now(): string {
    return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}

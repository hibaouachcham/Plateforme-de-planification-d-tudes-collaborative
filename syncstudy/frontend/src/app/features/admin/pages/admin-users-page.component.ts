import { Component, DestroyRef, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { User, UserStatus } from '../../../core/models/user.model';

const PAGE_SIZE = 5;

@Component({
  selector: 'app-admin-users-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 fade-in">
      <!-- Header -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-3xl font-black text-slate-900 dark:text-white">Gestion des Utilisateurs</h1>
          <p class="text-slate-500 dark:text-slate-400 mt-1">Administrez les comptes de la plateforme.</p>
        </div>
        <button
          type="button"
          (click)="openAddUserModal()"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
          <span class="material-icons text-base">person_add</span>
          Ajouter un utilisateur
        </button>
      </div>

      <!-- Filters -->
      <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
        <div class="flex flex-col sm:flex-row gap-4">
          <!-- Search -->
          <div class="flex-1 relative">
            <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-lg">search</span>
            <input [ngModel]="search()" (ngModelChange)="search.set($event)" type="text" placeholder="Rechercher un utilisateur..."
                   autocomplete="off"
                   class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm
                          text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500
                          focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
          </div>

          <!-- Status filter -->
          <div class="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1">
            @for (f of filters; track f.value) {
              <button (click)="statusFilter.set(f.value)"
                      [class]="statusFilter() === f.value
                        ? 'px-4 py-2 text-xs font-bold rounded-lg bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400 transition-all'
                        : 'px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all'">
                {{ f.label }}
              </button>
            }
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th class="text-left text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider px-6 py-4">Utilisateur</th>
                <th class="text-left text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider px-6 py-4 hidden md:table-cell">École</th>
                <th class="text-left text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider px-6 py-4 hidden lg:table-cell">Inscrit le</th>
                <th class="text-left text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider px-6 py-4">Rôle</th>
                <th class="text-left text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider px-6 py-4">Statut</th>
                <th class="text-left text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50 dark:divide-slate-700">
              @for (u of paginated(); track u.id) {
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                  <!-- User -->
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-9 h-9 bg-indigo-100 dark:bg-indigo-900 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span class="text-xs font-black text-indigo-600 dark:text-indigo-400">{{ u.name.charAt(0) }}</span>
                      </div>
                      <div class="min-w-0">
                        <p class="font-bold text-slate-900 dark:text-white text-sm truncate">{{ u.name }}</p>
                        <p class="text-xs text-slate-400 dark:text-slate-500 truncate">{{ u.email }}</p>
                      </div>
                    </div>
                  </td>

                  <!-- School -->
                  <td class="px-6 py-4 hidden md:table-cell">
                    <div class="min-w-0">
                      <p class="text-sm text-slate-700 dark:text-slate-200 font-medium truncate">{{ u.school }}</p>
                      <p class="text-xs text-slate-400 dark:text-slate-500 truncate">{{ u.level }}</p>
                    </div>
                  </td>

                  <!-- Date -->
                  <td class="px-6 py-4 hidden lg:table-cell">
                    <span class="text-sm text-slate-500 dark:text-slate-400">{{ u.joinedDate }}</span>
                  </td>

                  <!-- Role -->
                  <td class="px-6 py-4">
                    <span [class]="u.role === 'admin'
                      ? 'text-xs font-black bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full flex items-center gap-1 w-fit'
                      : 'text-xs font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-full flex items-center gap-1 w-fit'">
                      <span class="material-icons text-[10px]">{{ u.role === 'admin' ? 'shield' : 'person' }}</span>
                      {{ u.role === 'admin' ? 'Admin' : 'Étudiant' }}
                    </span>
                  </td>

                  <!-- Status -->
                  <td class="px-6 py-4">
                    <span [class]="u.status === 'active'
                      ? 'text-xs font-black bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full'
                      : 'text-xs font-black bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 px-2.5 py-1 rounded-full'">
                      {{ u.status === 'active' ? '● Actif' : '● Suspendu' }}
                    </span>
                  </td>

                  <!-- Actions -->
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-2">
                      <button (click)="admin.toggleStatus(u.id)"
                              [title]="u.status === 'active' ? 'Suspendre' : 'Réactiver'"
                              [class]="u.status === 'active'
                                ? 'p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950 text-red-400 hover:text-red-600 transition-all'
                                : 'p-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950 text-emerald-400 hover:text-emerald-600 transition-all'">
                        <span class="material-icons text-sm">
                          {{ u.status === 'active' ? 'person_off' : 'person' }}
                        </span>
                      </button>
                      <button (click)="openResetPwModal(u)"
                              title="Réinitialiser le mot de passe"
                              class="p-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-400 dark:text-slate-400 hover:text-indigo-600 transition-all">
                        <span class="material-icons text-sm">key</span>
                      </button>
                      @if (u.role !== 'admin') {
                        <button (click)="openDeleteModal(u)"
                                title="Supprimer l'utilisateur"
                                class="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950 text-slate-400 hover:text-red-600 transition-all">
                          <span class="material-icons text-sm">delete</span>
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="px-6 py-16 text-center">
                    <span class="material-icons text-4xl text-slate-200 dark:text-slate-700 block mb-2">manage_accounts</span>
                    <p class="text-slate-400 dark:text-slate-500 font-medium">Aucun utilisateur trouvé.</p>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        @if (totalPages() > 1) {
          <div class="px-6 py-4 border-t border-slate-50 dark:border-slate-700 flex items-center justify-between">
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {{ (page() - 1) * PAGE_SIZE + 1 }}–{{ Math.min(page() * PAGE_SIZE, filtered().length) }}
              sur {{ filtered().length }} utilisateurs
            </p>
            <div class="flex gap-2">
              <button (click)="prevPage()"
                      [disabled]="page() === 1"
                      class="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                <span class="material-icons text-sm text-slate-600 dark:text-slate-400">chevron_left</span>
              </button>
              @for (p of pageNumbers(); track p) {
                <button (click)="page.set(p)"
                        [class]="p === page()
                          ? 'w-8 h-8 rounded-xl text-xs font-black bg-indigo-600 text-white'
                          : 'w-8 h-8 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all'">
                  {{ p }}
                </button>
              }
              <button (click)="nextPage()"
                      [disabled]="page() === totalPages()"
                      class="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                <span class="material-icons text-sm text-slate-600 dark:text-slate-400">chevron_right</span>
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Modal ajout utilisateur -->
      @if (showAddUserModal()) {
        <div class="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
             (click)="closeAddUserModal()">
          <form
            (ngSubmit)="submitAddUser()"
            (click)="$event.stopPropagation()"
            class="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between">
              <h3 class="text-xl font-black text-slate-900 dark:text-white">Ajouter un utilisateur</h3>
              <button type="button" (click)="closeAddUserModal()" class="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                <span class="material-icons text-slate-500 dark:text-slate-400">close</span>
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="sm:col-span-2">
                <label class="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Nom complet</label>
                <input [(ngModel)]="newUser.name" name="name" required type="text"
                       autocomplete="off"
                       class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div class="sm:col-span-2">
                <label class="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">E-mail</label>
                <input [(ngModel)]="newUser.email" name="email" required type="email"
                       autocomplete="off"
                       class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label class="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">École</label>
                <input [(ngModel)]="newUser.school" name="school" type="text"
                       class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label class="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Niveau</label>
                <input [(ngModel)]="newUser.level" name="level" type="text"
                       class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div class="sm:col-span-2">
                <label class="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Rôle</label>
                <select [(ngModel)]="newUser.role" name="role"
                        class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="student">Étudiant</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <!-- Mot de passe -->
              <div class="sm:col-span-2">
                <div class="flex items-center justify-between mb-1">
                  <label class="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Mot de passe temporaire
                  </label>
                  <button type="button" (click)="generatePassword()"
                          class="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                    <span class="material-icons text-xs">auto_awesome</span>
                    Générer automatiquement
                  </button>
                </div>
                <div class="relative">
                  <input [(ngModel)]="newUser.password" name="password" required
                         [type]="showPassword ? 'text' : 'password'"
                         autocomplete="new-password"
                         placeholder="Minimum 8 caractères, 1 majuscule, 1 chiffre"
                         class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 pr-11 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <button type="button" (click)="showPassword = !showPassword"
                          class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <span class="material-icons text-lg">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
                  </button>
                </div>
                <p class="text-[11px] text-slate-400 mt-1">
                  L'utilisateur devra changer ce mot de passe à sa première connexion.
                </p>
              </div>
            </div>

            <!-- Erreur -->
            @if (addUserError()) {
              <div class="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-800">
                <span class="material-icons text-red-500 text-base">error_outline</span>
                <p class="text-xs font-bold text-red-600 dark:text-red-400">{{ addUserError() }}</p>
              </div>
            }

            <div class="flex justify-end gap-2 pt-2">
              <button type="button" (click)="closeAddUserModal()"
                      class="px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                Annuler
              </button>
              <button type="submit" [disabled]="addUserLoading()"
                      class="px-4 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
                @if (addUserLoading()) {
                  <span class="material-icons text-sm animate-spin">sync</span>
                }
                Créer
              </button>
            </div>
          </form>
        </div>
      }

      <!-- Modal succès : affiche le mot de passe généré -->
      @if (createdUserInfo()) {
        <div class="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <span class="material-icons text-emerald-600">check_circle</span>
              </div>
              <div>
                <h3 class="text-lg font-black text-slate-900 dark:text-white">Compte créé !</h3>
                <p class="text-xs text-slate-500">Transmettez ces identifiants à l'utilisateur.</p>
              </div>
            </div>

            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate-500">Email</span>
                <span class="text-sm font-bold text-slate-800 dark:text-slate-200">{{ createdUserInfo()!.email }}</span>
              </div>
              <div class="border-t border-slate-200 dark:border-slate-700 pt-2 flex items-center justify-between">
                <span class="text-xs text-slate-500">Mot de passe temporaire</span>
                <div class="flex items-center gap-2">
                  <code class="text-sm font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-lg">
                    {{ createdUserInfo()!.password }}
                  </code>
                  <button type="button" (click)="copyPassword()"
                          class="text-slate-400 hover:text-slate-600" title="Copier">
                    <span class="material-icons text-base">{{ copied() ? 'check' : 'content_copy' }}</span>
                  </button>
                </div>
              </div>
            </div>

            <p class="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-3 py-2 rounded-xl">
              ⚠ Notez ce mot de passe maintenant — il ne sera plus affiché.
            </p>

            <button type="button" (click)="createdUserInfo.set(null)"
                    class="w-full px-4 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all">
              Fermer
            </button>
          </div>
        </div>
      }
      <!-- ── Modale confirmation suppression ── -->
      @if (deleteUser()) {
        <div class="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
             (click)="closeDeleteModal()">
          <div class="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-700
                      bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-5"
               (click)="$event.stopPropagation()">

            <div class="flex items-start gap-4">
              <div class="w-12 h-12 bg-red-50 dark:bg-red-950 rounded-2xl flex items-center justify-center flex-shrink-0">
                <span class="material-icons text-red-500 text-2xl">delete_forever</span>
              </div>
              <div>
                <h3 class="text-lg font-black text-slate-900 dark:text-white">Supprimer l'utilisateur</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Vous êtes sur le point de supprimer définitivement le compte de
                  <span class="font-bold text-slate-800 dark:text-slate-200">{{ deleteUser()!.name }}</span>.
                </p>
              </div>
            </div>

            <div class="bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-800 rounded-2xl p-4 space-y-1.5">
              <p class="text-xs font-black text-red-700 dark:text-red-400 flex items-center gap-2">
                <span class="material-icons text-sm">warning</span>
                Cette action est irréversible
              </p>
              <p class="text-xs text-red-600 dark:text-red-400 pl-5">Toutes les sessions et données de l'utilisateur seront supprimées.</p>
              <p class="text-xs text-red-600 dark:text-red-400 pl-5">L'utilisateur sera retiré de tous ses groupes de travail.</p>
            </div>

            @if (deleteError()) {
              <div class="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-800">
                <span class="material-icons text-red-500 text-base">error_outline</span>
                <p class="text-xs font-bold text-red-600 dark:text-red-400">{{ deleteError() }}</p>
              </div>
            }

            <div class="flex justify-end gap-2 pt-1">
              <button type="button" (click)="closeDeleteModal()"
                      class="px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700
                             text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                Annuler
              </button>
              <button type="button" (click)="confirmDelete()" [disabled]="deleteLoading()"
                      class="px-5 py-2.5 rounded-xl text-sm font-bold bg-red-600 text-white
                             hover:bg-red-700 transition-all disabled:opacity-60
                             disabled:cursor-not-allowed flex items-center gap-2">
                @if (deleteLoading()) {
                  <span class="material-icons text-sm animate-spin">sync</span>
                } @else {
                  <span class="material-icons text-sm">delete</span>
                }
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ── Modale réinitialisation mot de passe admin ── -->
      @if (resetPwUser()) {
        <div class="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
             (click)="closeResetPwModal()">
          <div class="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-700
                      bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-5"
               (click)="$event.stopPropagation()">

            <!-- Header -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-indigo-50 dark:bg-indigo-950 rounded-xl flex items-center justify-center">
                  <span class="material-icons text-indigo-600">key</span>
                </div>
                <div>
                  <h3 class="text-lg font-black text-slate-900 dark:text-white">Réinitialiser le mot de passe</h3>
                  <p class="text-xs text-slate-500 dark:text-slate-400">{{ resetPwUser()!.name }}</p>
                </div>
              </div>
              <button type="button" (click)="closeResetPwModal()"
                      class="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                <span class="material-icons text-slate-500">close</span>
              </button>
            </div>

            <!-- Champ nouveau mot de passe -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Nouveau mot de passe
                </label>
                <button type="button" (click)="generateResetPw()"
                        class="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                  <span class="material-icons text-xs">auto_awesome</span>
                  Générer automatiquement
                </button>
              </div>
              <div class="relative">
                <input [(ngModel)]="resetPwValue"
                       [type]="showResetPw ? 'text' : 'password'"
                       autocomplete="new-password"
                       placeholder="Minimum 8 caractères"
                       class="w-full rounded-xl border border-slate-200 dark:border-slate-700
                              bg-slate-50 dark:bg-slate-800 px-3 py-2.5 pr-11 text-sm
                              text-slate-800 dark:text-slate-100
                              focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                <button type="button" (click)="showResetPw = !showResetPw"
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <span class="material-icons text-lg">{{ showResetPw ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
            </div>

            <!-- Erreur -->
            @if (resetPwError()) {
              <div class="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-800">
                <span class="material-icons text-red-500 text-base">error_outline</span>
                <p class="text-xs font-bold text-red-600 dark:text-red-400">{{ resetPwError() }}</p>
              </div>
            }

            <!-- Avertissement -->
            <p class="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-3 py-2 rounded-xl">
              ⚠ Le nouveau mot de passe sera actif immédiatement. Communiquez-le à l'utilisateur.
            </p>

            <!-- Actions -->
            <div class="flex justify-end gap-2 pt-1">
              <button type="button" (click)="closeResetPwModal()"
                      class="px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700
                             text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                Annuler
              </button>
              <button type="button" (click)="submitResetPw()" [disabled]="resetPwLoading()"
                      class="px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white
                             hover:bg-indigo-700 transition-all disabled:opacity-60
                             disabled:cursor-not-allowed flex items-center gap-2">
                @if (resetPwLoading()) {
                  <span class="material-icons text-sm animate-spin">sync</span>
                }
                Confirmer
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ── Modale succès reset ── -->
      @if (resetPwDone()) {
        <div class="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-700
                      bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center flex-shrink-0">
                <span class="material-icons text-emerald-600">check_circle</span>
              </div>
              <div>
                <h3 class="text-lg font-black text-slate-900 dark:text-white">Mot de passe réinitialisé !</h3>
                <p class="text-xs text-slate-500">Transmettez ce mot de passe à l'utilisateur.</p>
              </div>
            </div>

            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate-500">Utilisateur</span>
                <span class="text-sm font-bold text-slate-800 dark:text-slate-200">{{ resetPwDone()!.name }}</span>
              </div>
              <div class="border-t border-slate-200 dark:border-slate-700 pt-2 flex items-center justify-between">
                <span class="text-xs text-slate-500">Nouveau mot de passe</span>
                <div class="flex items-center gap-2">
                  <code class="text-sm font-mono font-black text-indigo-600 dark:text-indigo-400
                               bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-lg">
                    {{ resetPwDone()!.password }}
                  </code>
                  <button type="button" (click)="copyResetPw()"
                          class="text-slate-400 hover:text-slate-600" title="Copier">
                    <span class="material-icons text-base">{{ resetPwCopied() ? 'check' : 'content_copy' }}</span>
                  </button>
                </div>
              </div>
            </div>

            <p class="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-3 py-2 rounded-xl">
              ⚠ Notez ce mot de passe maintenant — il ne sera plus affiché.
            </p>

            <button type="button" (click)="resetPwDone.set(null)"
                    class="w-full px-4 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all">
              Fermer
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminUsersPageComponent {
  admin = inject(AdminService);
  private authSvc = inject(AuthService);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  Math  = Math;
  PAGE_SIZE = PAGE_SIZE;

  search           = signal('');
  statusFilter     = signal<'all' | UserStatus>('all');
  page             = signal(1);
  showAddUserModal = signal(false);
  addUserLoading   = signal(false);
  addUserError     = signal('');
  createdUserInfo  = signal<{ email: string; password: string } | null>(null);
  copied           = signal(false);
  showPassword     = false;
  newUser: Pick<User, 'name' | 'email' | 'school' | 'level' | 'role'> & { password: string } = this.emptyNewUser();

  // ── Delete user ──
  deleteUser    = signal<User | null>(null);
  deleteLoading = signal(false);
  deleteError   = signal('');

  // ── Reset password ──
  resetPwUser    = signal<User | null>(null);
  resetPwValue   = '';
  showResetPw    = false;
  resetPwLoading = signal(false);
  resetPwError   = signal('');
  resetPwDone    = signal<{ name: string; password: string } | null>(null);
  resetPwCopied  = signal(false);

  filters = [
    { label: 'Tous',     value: 'all'       as const },
    { label: 'Actifs',   value: 'active'    as const },
    { label: 'Suspendus',value: 'suspended' as const },
  ];

  constructor() {
    this.admin.loadUsers();
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const q = params['q'];
        if (q != null && String(q).trim() !== '') {
          this.search.set(String(q).trim());
          this.page.set(1);
        }
      });
  }

  prevPage(): void { this.page.update((p) => Math.max(1, p - 1)); }
  nextPage(): void { this.page.update((p) => Math.min(this.totalPages(), p + 1)); }

  openAddUserModal(): void {
    this.newUser = this.emptyNewUser();
    this.addUserError.set('');
    this.showPassword = false;
    this.showAddUserModal.set(true);
  }

  closeAddUserModal(): void {
    this.showAddUserModal.set(false);
    this.addUserError.set('');
  }

  generatePassword(): void {
    const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower   = 'abcdefghijkmnpqrstuvwxyz';
    const digits  = '23456789';
    const special = '@#$!';
    const all     = upper + lower + digits;
    let pwd = upper[Math.floor(Math.random() * upper.length)]
            + digits[Math.floor(Math.random() * digits.length)]
            + special[Math.floor(Math.random() * special.length)];
    for (let i = 0; i < 6; i++) pwd += all[Math.floor(Math.random() * all.length)];
    // Mélanger
    this.newUser.password = pwd.split('').sort(() => Math.random() - 0.5).join('');
    this.showPassword = true;
  }

  async submitAddUser(): Promise<void> {
    if (!this.newUser.name.trim() || !this.newUser.email.trim() || !this.newUser.password.trim()) {
      this.addUserError.set('Nom, e-mail et mot de passe sont obligatoires.');
      return;
    }
    if (this.newUser.password.length < 8) {
      this.addUserError.set('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    this.addUserError.set('');
    this.addUserLoading.set(true);
    const savedPassword = this.newUser.password;
    try {
      await this.admin.createUser({
        name:     this.newUser.name.trim(),
        email:    this.newUser.email.trim(),
        password: savedPassword,
        school:   this.newUser.school.trim(),
        level:    this.newUser.level.trim(),
        role:     this.newUser.role,
      });
      this.closeAddUserModal();
      this.createdUserInfo.set({ email: this.newUser.email.trim(), password: savedPassword });
    } catch (err: any) {
      const status = err?.status;
      if (status === 409) this.addUserError.set('Cet e-mail est déjà utilisé.');
      else this.addUserError.set('Erreur lors de la création du compte. Réessayez.');
    } finally {
      this.addUserLoading.set(false);
    }
  }

  copyPassword(): void {
    const info = this.createdUserInfo();
    if (!info) return;
    navigator.clipboard.writeText(info.password).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  openDeleteModal(user: User): void {
    this.deleteUser.set(user);
    this.deleteError.set('');
  }

  closeDeleteModal(): void {
    this.deleteUser.set(null);
    this.deleteError.set('');
  }

  confirmDelete(): void {
    const user = this.deleteUser();
    if (!user) return;
    this.deleteLoading.set(true);
    this.admin.deleteUser(user.id).subscribe({
      next: () => {
        this.deleteLoading.set(false);
        this.closeDeleteModal();
      },
      error: (err) => {
        this.deleteLoading.set(false);
        if (err.status === 403) this.deleteError.set('Impossible de supprimer un compte administrateur.');
        else if (err.status === 404) this.deleteError.set('Utilisateur introuvable.');
        else this.deleteError.set('Erreur lors de la suppression. Réessayez.');
      },
    });
  }

  openResetPwModal(user: User): void {
    this.resetPwUser.set(user);
    this.resetPwValue  = '';
    this.showResetPw   = false;
    this.resetPwError.set('');
  }

  closeResetPwModal(): void {
    this.resetPwUser.set(null);
    this.resetPwError.set('');
    this.resetPwValue = '';
    // Si Chrome a autofillé la recherche, on la remet à zéro
    if (this.search().includes('@')) this.search.set('');
  }

  generateResetPw(): void {
    const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower   = 'abcdefghijkmnpqrstuvwxyz';
    const digits  = '23456789';
    const special = '@#$!';
    const all     = upper + lower + digits;
    let pwd = upper[Math.floor(Math.random() * upper.length)]
            + digits[Math.floor(Math.random() * digits.length)]
            + special[Math.floor(Math.random() * special.length)];
    for (let i = 0; i < 6; i++) pwd += all[Math.floor(Math.random() * all.length)];
    this.resetPwValue = pwd.split('').sort(() => Math.random() - 0.5).join('');
    this.showResetPw  = true;
  }

  submitResetPw(): void {
    const user = this.resetPwUser();
    if (!user) return;
    if (!this.resetPwValue || this.resetPwValue.length < 8) {
      this.resetPwError.set('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    this.resetPwLoading.set(true);
    this.resetPwError.set('');
    const savedPw = this.resetPwValue;
    this.authSvc.resetPasswordDirect(user.email, savedPw, '').subscribe({
      next: () => {
        this.resetPwLoading.set(false);
        this.closeResetPwModal();
        this.resetPwDone.set({ name: user.name, password: savedPw });
      },
      error: (err) => {
        this.resetPwLoading.set(false);
        if (err.status === 404) this.resetPwError.set('Utilisateur introuvable.');
        else if (err.status === 403) this.resetPwError.set('Compte suspendu — réactivez-le d\'abord.');
        else this.resetPwError.set('Échec de la réinitialisation. Réessayez.');
      },
    });
  }

  copyResetPw(): void {
    const info = this.resetPwDone();
    if (!info) return;
    navigator.clipboard.writeText(info.password).then(() => {
      this.resetPwCopied.set(true);
      setTimeout(() => this.resetPwCopied.set(false), 2000);
    });
  }

  filtered = computed(() => {
    const q = this.search().toLowerCase();
    return this.admin.users().filter((u) => {
      const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchStatus = this.statusFilter() === 'all' || u.status === this.statusFilter();
      return matchSearch && matchStatus;
    });
  });

  paginated    = computed(() => this.filtered().slice((this.page() - 1) * PAGE_SIZE, this.page() * PAGE_SIZE));
  totalPages   = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));
  pageNumbers  = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  private emptyNewUser(): Pick<User, 'name' | 'email' | 'school' | 'level' | 'role'> & { password: string } {
    return { name: '', email: '', school: '', level: '', role: 'student', password: '' };
  }
}
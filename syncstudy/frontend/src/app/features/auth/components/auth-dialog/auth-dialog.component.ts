import { Component, inject, signal, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { passwordStrengthValidator, emailValidator } from '../../../../core/validators/auth.validators';
import { environment } from '@env/environment';

type AuthMode = 'login' | 'signup' | 'forgot';

@Component({
  selector: 'app-auth-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  template: `
    <div class="p-8 w-full relative max-h-[85vh] overflow-y-auto">
      <div class="flex items-center gap-2 mb-8">
        <div class="bg-indigo-600 p-2 rounded-xl"><span class="material-icons text-white">school</span></div>
        <span class="text-xl font-black text-slate-900">SyncStudy</span>
      </div>

      <h2 class="text-2xl font-black text-slate-900 mb-1">
        {{ mode()==='login' ? 'Bon retour !' : mode()==='signup' ? 'Créer un compte' : 'Nouveau mot de passe' }}
      </h2>
      <p class="text-sm text-slate-500 mb-6">
        {{ mode()==='login' ? 'Connectez-vous pour accéder à votre planning.'
         : mode()==='signup' ? "Rejoignez des milliers d'étudiants ingénieurs."
         : 'Choisissez un nouveau mot de passe sécurisé pour votre compte.' }}
      </p>

      <form [formGroup]="form" (ngSubmit)="submit()" autocomplete="off" class="space-y-4">
        @if (mode() === 'signup') {
          <div>
            <label class="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Nom complet</label>
            <input formControlName="name" type="text" placeholder="Hiba Ouachcham"
                   [class]="fieldClass('name')" />
            @if (f['name'].invalid && f['name'].touched) {
              <p class="text-xs text-red-500 mt-1 font-medium">Nom requis</p>
            }
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">École</label>
              <input formControlName="school" type="text" placeholder="EST Fès"
                     [class]="fieldClass('school')" />
              @if (f['school'].invalid && f['school'].touched) {
                <p class="text-xs text-red-500 mt-1 font-medium">École requise</p>
              }
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Niveau</label>
              <input formControlName="level" type="text" placeholder="2ème année"
                     [class]="fieldClass('level')" />
              @if (f['level'].invalid && f['level'].touched) {
                <p class="text-xs text-red-500 mt-1 font-medium">Niveau requis</p>
              }
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Téléphone (optionnel)</label>
              <input formControlName="phone" type="tel" placeholder="+212..."
                     [class]="fieldClass('phone')" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Date de naissance (optionnel)</label>
              <input formControlName="birthDate" type="date"
                     [class]="fieldClass('birthDate')" />
            </div>
          </div>
        }

        <div>
          <label class="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Email</label>
          <input formControlName="email" type="email" placeholder="vous@exemple.com"
                 [autocomplete]="mode() === 'login' ? 'email' : 'off'"
                 [class]="fieldClass('email')" />
          @if (f['email'].invalid && f['email'].touched) {
            <p class="text-xs text-red-500 mt-1 font-medium">Email invalide</p>
          }
        </div>

        @if (mode() === 'login' || mode() === 'signup') {
          <div>
            <label class="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Mot de passe</label>
            <div class="relative">
              <input formControlName="password" [type]="showPw() ? 'text' : 'password'"
                     [autocomplete]="mode() === 'login' ? 'current-password' : 'new-password'"
                     placeholder="••••••••" [class]="fieldClass('password') + ' pr-11'" />
              <button type="button" (click)="showPw.set(!showPw())"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <span class="material-icons text-lg">{{ showPw() ? 'visibility_off' : 'visibility' }}</span>
              </button>
            </div>
            @if (mode() === 'signup' && f['password'].value) {
              <div class="mt-2">
                <div class="flex gap-1 mb-1.5">
                  @for (bar of strengthBars(); track bar) {
                    <div [class]="'flex-1 h-1 rounded-full transition-all ' + bar"></div>
                  }
                </div>
                @for (rule of pwRules(); track rule.label) {
                  <p [class]="'text-[10px] font-bold flex items-center gap-1 '+(rule.met?'text-emerald-600':'text-slate-400')">
                    <span class="material-icons text-[10px]">{{ rule.met ? 'check_circle' : 'radio_button_unchecked' }}</span>
                    {{ rule.label }}
                  </p>
                }
              </div>
            }
          </div>
        }

        @if (mode() === 'signup') {
          <div>
            <label class="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
              Indice mémo
              <span class="text-slate-400 font-normal normal-case tracking-normal ml-1">(optionnel)</span>
            </label>
            <input formControlName="passwordHint" type="text"
                   placeholder="Ex : Nom de mon animal + année de naissance"
                   class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm
                          focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
            <p class="text-[11px] text-slate-400 mt-1">
              Un indice pour retrouver votre mot de passe. Ne notez pas le mot de passe lui-même.
            </p>
          </div>
        }

        <!-- ── Champs spécifiques au mode "Mot de passe oublié" ── -->
        @if (mode() === 'forgot') {
          <!-- Nouveau mot de passe -->
          <div>
            <label class="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Nouveau mot de passe</label>
            <div class="relative">
              <input formControlName="newPassword" [type]="showNewPw() ? 'text' : 'password'"
                     autocomplete="new-password"
                     placeholder="••••••••" [class]="fieldClass('newPassword') + ' pr-11'" />
              <button type="button" (click)="showNewPw.set(!showNewPw())"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <span class="material-icons text-lg">{{ showNewPw() ? 'visibility_off' : 'visibility' }}</span>
              </button>
            </div>
            @if (f['newPassword'].value) {
              <div class="mt-2">
                <div class="flex gap-1 mb-1.5">
                  @for (bar of strengthNewBars(); track bar) {
                    <div [class]="'flex-1 h-1 rounded-full transition-all ' + bar"></div>
                  }
                </div>
                @for (rule of pwNewRules(); track rule.label) {
                  <p [class]="'text-[10px] font-bold flex items-center gap-1 '+(rule.met?'text-emerald-600':'text-slate-400')">
                    <span class="material-icons text-[10px]">{{ rule.met ? 'check_circle' : 'radio_button_unchecked' }}</span>
                    {{ rule.label }}
                  </p>
                }
              </div>
            }
          </div>

          <!-- Confirmer le mot de passe -->
          <div>
            <label class="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Confirmer le mot de passe</label>
            <div class="relative">
              <input formControlName="confirmPassword" [type]="showNewPw() ? 'text' : 'password'"
                     autocomplete="new-password"
                     placeholder="••••••••"
                     [class]="'w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all pr-11 '
                              + (!passwordsMatch() ? 'border-red-300' : 'border-slate-200')" />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 material-icons text-lg"
                    [class]="f['confirmPassword'].value ? (passwordsMatch() ? 'text-emerald-500' : 'text-red-400') : 'text-slate-300'">
                {{ f['confirmPassword'].value ? (passwordsMatch() ? 'check_circle' : 'cancel') : 'lock' }}
              </span>
            </div>
            @if (f['confirmPassword'].value && !passwordsMatch()) {
              <p class="text-xs text-red-500 mt-1 font-medium">Les mots de passe ne correspondent pas</p>
            }
          </div>

          <!-- Indice mémo -->
          <div>
            <label class="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
              Indice mémo
              <span class="text-slate-400 font-normal normal-case tracking-normal ml-1">(optionnel)</span>
            </label>
            <input formControlName="passwordHint" type="text"
                   placeholder="Ex : Nom de mon premier animal + année de naissance"
                   class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm
                          focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
            <p class="text-[11px] text-slate-400 mt-1">
              Un indice pour vous souvenir de ce mot de passe. Ne notez pas le mot de passe lui-même.
            </p>
          </div>
        }

        @if (mode() === 'login') {
          @if (passwordHintText()) {
            <div class="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
              <span class="material-icons text-amber-500 text-lg flex-shrink-0 mt-0.5">lightbulb</span>
              <div>
                <p class="text-xs font-black text-amber-700 mb-0.5">Indice de mot de passe</p>
                <p class="text-xs text-amber-800 italic">« {{ passwordHintText() }} »</p>
              </div>
            </div>
          }
          <div class="text-right">
            <button type="button" (click)="switchMode('forgot')"
                    class="text-xs font-bold text-indigo-600 hover:text-indigo-700">
              Mot de passe oublié ?
            </button>
          </div>
        }

        @if (suspendedError()) {
          <div class="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
            <span class="material-icons text-red-500 text-xl flex-shrink-0 mt-0.5">block</span>
            <div>
              <p class="text-sm font-black text-red-700">Compte suspendu</p>
              <p class="text-xs text-red-600 mt-0.5">
                Votre compte a été suspendu par l'administrateur.
                Pour toute demande de réactivation, contactez le support.
              </p>
            </div>
          </div>
        }

        <button type="submit" [disabled]="loading()"
                class="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-sm
                       hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 mt-2
                       disabled:opacity-60 disabled:cursor-not-allowed">
          @if (loading()) {
            <span class="material-icons animate-spin text-base align-middle mr-1">sync</span>
          }
          {{ mode()==='login' ? 'Se connecter' : mode()==='signup' ? 'Créer mon compte' : 'Réinitialiser le mot de passe' }}
        </button>
      </form>


      <p class="text-center text-sm text-slate-500 mt-6">
        @if (mode() === 'login') {
          Pas encore de compte ?
          <button (click)="switchMode('signup')" class="text-indigo-600 font-bold hover:underline ml-1">S'inscrire</button>
        } @else {
          Déjà un compte ?
          <button (click)="switchMode('login')" class="text-indigo-600 font-bold hover:underline ml-1">Se connecter</button>
        }
      </p>

      <button (click)="dialogRef.close(false)"
              class="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100 transition-all">
        <span class="material-icons text-slate-400">close</span>
      </button>
    </div>
  `,
})
export class AuthDialogComponent {
  dialogRef = inject(MatDialogRef<AuthDialogComponent>);
  auth      = inject(AuthService);
  toast     = inject(ToastService);
  private fb = inject(FormBuilder);

  mode             = signal<AuthMode>('login');
  showPw           = signal(false);
  showNewPw        = signal(false);
  loading          = signal(false);
  suspendedError   = signal(false);
  loginAttempts    = signal(0);
  passwordHintText = signal<string | null>(null);
  isDevMode        = signal(!environment.production);

  form = this.fb.group({
    name:            ['', [Validators.required, Validators.minLength(2)]],
    school:          ['', [Validators.required, Validators.minLength(2)]],
    level:           ['', [Validators.required, Validators.minLength(2)]],
    phone:           [''],
    birthDate:       [''],
    email:           ['', [Validators.required, emailValidator]],
    // Pas de passwordStrengthValidator ici : il est appliqué dynamiquement selon le mode
    password:        ['', [Validators.required]],
    newPassword:     [''],
    confirmPassword: [''],
    passwordHint:    [''],
  });

  get f() { return this.form.controls; }

  constructor(@Inject(MAT_DIALOG_DATA) data: { mode: AuthMode }) {
    const initialMode = data?.mode ?? 'login';
    this.mode.set(initialMode);
    this.updatePasswordValidators(initialMode);
    // Réinitialiser la bannière suspendu quand le mode change ou quand l'utilisateur tape
    this.form.valueChanges.subscribe(() => this.suspendedError.set(false));
  }

  /**
   * Adapte les validateurs du champ password selon le mode :
   *  - login  : seul Validators.required (l'utilisateur peut avoir un ancien mdp sans caractère spécial)
   *  - signup : validation forte (longueur, majuscule, chiffre, caractère spécial)
   *  - forgot  : pas de validateur (champ non utilisé dans ce mode)
   */
  private updatePasswordValidators(m: AuthMode): void {
    const ctrl = this.form.get('password')!;
    if (m === 'signup') {
      ctrl.setValidators([Validators.required, passwordStrengthValidator]);
    } else {
      ctrl.setValidators([Validators.required]);
    }
    ctrl.updateValueAndValidity();
  }

  switchMode(m: AuthMode): void {
    this.mode.set(m);
    this.suspendedError.set(false);
    this.loginAttempts.set(0);
    this.passwordHintText.set(null);
    // Vider tous les champs et repartir proprement
    this.form.reset();
    this.showPw.set(false);
    this.showNewPw.set(false);
    // Mettre à jour les validateurs selon le nouveau mode
    this.updatePasswordValidators(m);
  }

  fieldClass(field: string): string {
    const ctrl = this.f[field as keyof typeof this.f];
    const base = 'w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all';
    return base + (ctrl.invalid && ctrl.touched ? ' border-red-300' : ' border-slate-200');
  }

  pwRules() {
    const pw = this.f['password'].value ?? '';
    return [
      { label: 'Minimum 8 caractères',  met: pw.length >= 8    },
      { label: 'Au moins une majuscule', met: /[A-Z]/.test(pw) },
      { label: 'Au moins un chiffre',    met: /[0-9]/.test(pw) },
    ];
  }

  strengthBars(): string[] {
    const met = this.pwRules().filter((r) => r.met).length;
    const colors = ['bg-red-400', 'bg-amber-400', 'bg-emerald-500'];
    return [0, 1, 2].map((i) => i < met ? colors[met - 1] : 'bg-slate-200');
  }

  pwNewRules() {
    const pw = this.f['newPassword'].value ?? '';
    return [
      { label: 'Minimum 8 caractères',  met: pw.length >= 8    },
      { label: 'Au moins une majuscule', met: /[A-Z]/.test(pw) },
      { label: 'Au moins un chiffre',    met: /[0-9]/.test(pw) },
    ];
  }

  strengthNewBars(): string[] {
    const met = this.pwNewRules().filter((r) => r.met).length;
    const colors = ['bg-red-400', 'bg-amber-400', 'bg-emerald-500'];
    return [0, 1, 2].map((i) => i < met ? colors[met - 1] : 'bg-slate-200');
  }

  passwordsMatch(): boolean {
    const confirm = this.f['confirmPassword'].value;
    if (!confirm) return true;
    return this.f['newPassword'].value === confirm;
  }

  submit(): void {
    if (this.loading()) return;
    if (this.mode() === 'login') {
      this.loading.set(true);
      this.auth.login(this.f['email'].value!, this.f['password'].value!).subscribe({
        next: () => {
          this.toast.show('Bienvenue sur SyncStudy !');
          this.dialogRef.close(true);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          if (err.status === 403) {
            this.suspendedError.set(true);
          } else {
            this.suspendedError.set(false);
            const attempts = this.loginAttempts() + 1;
            this.loginAttempts.set(attempts);
            this.toast.show('Échec de connexion. Vérifiez vos identifiants.', 'error');
            // À partir de la 2e tentative, afficher l'indice mémo si disponible
            if (attempts >= 2) {
              const email = this.f['email'].value?.trim();
              if (email) {
                this.auth.getPasswordHint(email).subscribe((hint) => {
                  this.passwordHintText.set(hint || null);
                });
              }
            }
          }
        },
      });
    } else if (this.mode() === 'signup') {
      if (this.form.invalid) {
        this.form.markAllAsTouched();
        this.toast.show('Veuillez corriger les champs requis (email valide, mot de passe fort, école et niveau).', 'warning');
        return;
      }
      this.loading.set(true);
      this.auth.signup(
        this.f['name'].value!,
        this.f['email'].value!,
        this.f['password'].value!,
        {
          school:       this.f['school'].value!,
          level:        this.f['level'].value!,
          phone:        this.f['phone'].value ?? '',
          birthDate:    this.f['birthDate'].value ?? '',
          passwordHint: this.f['passwordHint'].value ?? '',
        }
      ).subscribe({
        next: () => {
          this.toast.show('Compte créé avec succès ! Bienvenue !');
          this.dialogRef.close(true);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          if (err.status === 400) {
            this.toast.show('Inscription impossible : e-mail déjà utilisé ou données invalides.', 'error');
          } else {
            this.toast.show('Échec de création du compte.', 'error');
          }
        },
      });
    } else {
      // Mode "forgot" — réinitialisation directe
      const email  = this.f['email'].value?.trim();
      const newPwd = this.f['newPassword'].value;
      if (!email || !newPwd) {
        this.toast.show('Veuillez remplir votre email et le nouveau mot de passe.', 'warning');
        return;
      }
      if (!this.passwordsMatch()) {
        this.toast.show('Les mots de passe ne correspondent pas.', 'error');
        return;
      }
      if (!this.pwNewRules().every((r) => r.met)) {
        this.toast.show('Mot de passe trop faible (8 car., majuscule, chiffre requis).', 'warning');
        return;
      }
      this.loading.set(true);
      this.auth.resetPasswordDirect(email, newPwd, this.f['passwordHint'].value ?? '').subscribe({
        next: () => {
          this.loading.set(false);
          this.toast.show('Mot de passe réinitialisé avec succès !', 'info');
          this.switchMode('login');
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          if (err.status === 404) {
            this.toast.show('Aucun compte trouvé pour cet email.', 'error');
          } else if (err.status === 403) {
            this.suspendedError.set(true);
          } else {
            this.toast.show('Échec de la réinitialisation. Réessayez.', 'error');
          }
        },
      });
    }
  }

  quickUiLogin(role: 'student' | 'admin'): void {
    // Remplir automatiquement les identifiants de test et se connecter
    const credentials = role === 'admin'
      ? { email: 'adminsyncstudy@gmail.com', password: 'Admin@2026' }
      : { email: 'test@syncstudy.ma',        password: 'Test@1234'  };

    this.form.patchValue(credentials);
    this.loading.set(true);

    this.auth.login(credentials.email, credentials.password).subscribe({
      next: () => {
        this.toast.show(role === 'admin' ? '👤 Connecté en tant qu\'Admin' : '🎓 Connecté en tant qu\'Étudiant');
        this.dialogRef.close(true);
      },
      error: () => {
        this.loading.set(false);
        this.toast.show(
          role === 'admin'
            ? 'Compte admin introuvable — redémarrez le backend pour le créer.'
            : 'Compte test introuvable.',
          'error'
        );
      },
    });
  }

  quickUiSignupStudent(): void {
    this.toast.show('Mode test UI désactivé. Utilisez une inscription réelle.', 'info');
  }
}

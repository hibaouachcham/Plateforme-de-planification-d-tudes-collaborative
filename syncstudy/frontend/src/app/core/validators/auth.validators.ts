import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const passwordStrengthValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value: string = control.value ?? '';
  const errors: ValidationErrors = {};

  if (value.length < 8)              errors['minLength'] = 'Minimum 8 caractères';
  if (!/[A-Z]/.test(value))          errors['uppercase'] = 'Au moins une majuscule';
  if (!/[0-9]/.test(value))          errors['digit']     = 'Au moins un chiffre';
  if (!/[!@#$%^&*()_+\-=\[\]{}]/.test(value))
                                     errors['special']   = 'Au moins un caractère spécial (!@#$%^&*...)';

  return Object.keys(errors).length ? errors : null;
};

export const emailValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value: string = control.value ?? '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value) ? null : { invalidEmail: 'Email invalide' };
};
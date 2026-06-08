import { Injectable, signal, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  private isDark = signal<boolean>(false);

  isDark$ = this.isDark.asReadonly();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initTheme();
    }
  }

  private initTheme() {
    // Récupérer la préférence sauvegardée
    const savedTheme = localStorage.getItem('darkMode');
    
    if (savedTheme !== null) {
      this.isDark.set(savedTheme === 'true');
    } else {
      // Sinon utiliser la préférence système
      this.isDark.set(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }

    // Appliquer le thème
    effect(() => {
      this.applyTheme(this.isDark());
    });
  }

  toggle(): void {
    this.isDark.update(v => !v);
  }

  private applyTheme(isDark: boolean): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const html = document.documentElement;
    
    if (isDark) {
      html.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }
}
import { Injectable, signal } from '@angular/core';

export interface Toast { message: string; type: 'success' | 'info' | 'error' | 'warning'; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toast = signal<Toast | null>(null);
  private _timer: ReturnType<typeof setTimeout> | null = null;
  /** §4.5.2 CDC : bas à droite, 5 secondes */
  show(message: string, type: Toast['type'] = 'success'): void {
    if (this._timer) clearTimeout(this._timer);
    this.toast.set({ message, type });
    this._timer = setTimeout(() => this.toast.set(null), 5000);
  }
}

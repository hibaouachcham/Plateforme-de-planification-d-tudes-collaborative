import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (toast.toast()) {
      <div class="fixed bottom-6 right-6 z-[100] slide-in-up
                  bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl
                  flex items-center gap-3 pointer-events-none max-w-sm">
        <div class="p-1 rounded-full flex-shrink-0"
             [class]="toastClass()">
          <span class="material-icons text-sm text-white">{{ toastIcon() }}</span>
        </div>
        <span class="text-sm font-bold">{{ toast.toast()!.message }}</span>
      </div>
    }
  `,
})
export class ToastComponent {
  toast = inject(ToastService);

  toastClass = computed(() => {
    const t = this.toast.toast()?.type;
    if (t === 'error') return 'bg-red-500';
    if (t === 'warning') return 'bg-amber-500';
    if (t === 'info') return 'bg-blue-500';
    return 'bg-indigo-500';
  });

  toastIcon = computed(() => {
    const t = this.toast.toast()?.type;
    if (t === 'error') return 'error';
    if (t === 'warning') return 'warning';
    if (t === 'info') return 'info';
    return 'check_circle';
  });
}

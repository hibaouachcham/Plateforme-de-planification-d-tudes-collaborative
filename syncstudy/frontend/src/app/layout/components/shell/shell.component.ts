import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { SessionBarComponent } from '../../../shared/components/session-bar/session-bar.component';
import { SocketService } from '../../../core/services/socket.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent, SessionBarComponent],
  template: `
    <div class="min-h-screen flex bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      <!-- Sidebar -->
      <app-sidebar />

      <!-- Main area -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden pt-0 lg:pt-0 bg-slate-50 dark:bg-slate-950">
        <!-- Mobile top padding for fixed mobile bar -->
        <div class="h-14 lg:hidden flex-shrink-0"></div>

        <app-header />

        <!-- Active session bar -->
        <app-session-bar />

        <!-- Page content -->
        <main id="main-content" tabindex="-1" class="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50 dark:bg-slate-950">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class ShellComponent implements OnInit, OnDestroy {
  private socket = inject(SocketService);
  private auth = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void { 
    this.socket.connect();
  }
  ngOnDestroy(): void { 
    this.socket.disconnect(); 
  }
}
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AuthDialogComponent } from './auth-dialog.component';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  template: `<div class="min-h-screen bg-slate-50"></div>`,
})
export class AuthPageComponent implements OnInit {
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private auth   = inject(AuthService);

  ngOnInit(): void {
    const ref = this.dialog.open(AuthDialogComponent, {
      width: '440px',
      disableClose: true,
      panelClass: 'syncstudy-dialog',
      data: { mode: 'login' },
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) { this.router.navigate(['/']); return; }
      // Rediriger vers l'espace admin si le rôle est admin, sinon vers le dashboard étudiant
      const target = this.auth.isAdmin() ? '/app/admin' : '/app/dashboard';
      this.router.navigate([target]);
    });
  }
}

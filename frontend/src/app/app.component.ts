import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from './services/auth.service';
import { ChatbotComponent } from './components/chatbot/chatbot.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule, ChatbotComponent],
  template: `
    <!-- Show toolbar only when NOT on landing page or auth pages -->
    @if (!isPublicPage()) {
      <mat-toolbar color="primary">
        <a routerLink="/" class="brand-link">
          <img src="assets/images/logo-chair.png" alt="SmartServe" class="toolbar-logo">
          <span>SmartServe</span>
        </a>
        <a mat-icon-button routerLink="/" matTooltip="Home" class="home-btn">
          <mat-icon>home</mat-icon>
        </a>
        <span style="flex: 1"></span>
        @if (authService.isLoggedIn()) {
          <a mat-button routerLink="/tables"><mat-icon>table_restaurant</mat-icon> Tables</a>
          <a mat-button routerLink="/queue"><mat-icon>people</mat-icon> Queue</a>
          <a mat-button routerLink="/reservation"><mat-icon>event</mat-icon> Reservations</a>
          @if (authService.isManager()) {
            <a mat-button routerLink="/manager/dashboard"><mat-icon>dashboard</mat-icon> Dashboard</a>
            <a mat-button routerLink="/analytics"><mat-icon>analytics</mat-icon> Analytics</a>
          }
          @if (authService.isAdmin()) {
            <button mat-button [matMenuTriggerFor]="adminMenu">
              <mat-icon>admin_panel_settings</mat-icon> Admin
            </button>
            <mat-menu #adminMenu="matMenu">
              <a mat-menu-item routerLink="/admin/dashboard">
                <mat-icon>dashboard</mat-icon> Admin Dashboard
              </a>
              <a mat-menu-item routerLink="/admin/users">
                <mat-icon>people</mat-icon> User Management
              </a>
              <a mat-menu-item routerLink="/admin/settings">
                <mat-icon>settings</mat-icon> System Settings
              </a>
              <a mat-menu-item routerLink="/admin/logs">
                <mat-icon>history</mat-icon> Activity Logs
              </a>
            </mat-menu>
          }
          <button mat-button [matMenuTriggerFor]="userMenu">
            <mat-icon>account_circle</mat-icon> {{ authService.user()?.name }}
          </button>
          <mat-menu #userMenu="matMenu">
            <button mat-menu-item disabled>
              <mat-icon>badge</mat-icon> {{ authService.user()?.role }}
            </button>
            <button mat-menu-item (click)="authService.logout()">
              <mat-icon>logout</mat-icon> Logout
            </button>
          </mat-menu>
        } @else {
          <a mat-button routerLink="/login">Login</a>
          <a mat-button routerLink="/register">Register</a>
        }
      </mat-toolbar>
    }
    
    <div [class.container]="!isPublicPage()">
      <router-outlet></router-outlet>
    </div>
    
    <!-- Chatbot Widget (only shown when logged in and not on public pages) -->
    @if (authService.isLoggedIn() && !isPublicPage()) {
      <app-chatbot></app-chatbot>
    }
  `,
  styles: [`
    .brand-link {
      display: flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      color: inherit;
    }
    .toolbar-logo {
      width: 36px;
      height: 36px;
      object-fit: contain;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    }
    .home-btn {
      margin-left: 8px;
      color: inherit;
    }
  `]
})
export class AppComponent {
  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  // Check if current page is a public page (landing, login, register)
  isPublicPage(): boolean {
    const publicRoutes = ['/', '', '/login', '/register'];
    return publicRoutes.includes(this.router.url) || this.router.url.startsWith('/login') || this.router.url.startsWith('/register');
  }
}

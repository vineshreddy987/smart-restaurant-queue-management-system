import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from './services/auth.service';
import { ChatbotComponent } from './components/chatbot/chatbot.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule, MatSidenavModule, MatListModule, MatDividerModule, ChatbotComponent],
  template: `
    <!-- Show toolbar only when NOT on landing page or auth pages -->
    @if (!isPublicPage()) {
      <mat-toolbar color="primary" class="main-toolbar">
        <!-- Mobile Menu Button -->
        <button mat-icon-button class="mobile-menu-btn" (click)="toggleMobileMenu()">
          <mat-icon>menu</mat-icon>
        </button>
        
        <a routerLink="/" class="brand-link">
          <img src="assets/images/logo-chair.png" alt="SmartServe" class="toolbar-logo" width="36" height="36">
          <span class="brand-name">SmartServe</span>
        </a>
        
        <span class="spacer"></span>
        
        <!-- Desktop Navigation -->
        @if (authService.isLoggedIn()) {
          <nav class="desktop-nav">
            <a mat-button routerLink="/tables"><mat-icon>table_restaurant</mat-icon> <span>Tables</span></a>
            <a mat-button routerLink="/queue"><mat-icon>people</mat-icon> <span>Queue</span></a>
            <a mat-button routerLink="/reservation"><mat-icon>event</mat-icon> <span>Reservations</span></a>
            <a mat-button routerLink="/reservations/history"><mat-icon>history</mat-icon> <span>History</span></a>
            @if (authService.isManager()) {
              <button mat-button [matMenuTriggerFor]="managerMenu">
                <mat-icon>dashboard</mat-icon> <span>Manager</span>
              </button>
              <mat-menu #managerMenu="matMenu">
                <a mat-menu-item routerLink="/manager/dashboard">
                  <mat-icon>dashboard</mat-icon> Dashboard
                </a>
                <a mat-menu-item routerLink="/manager/history">
                  <mat-icon>history</mat-icon> Booking History
                </a>
                <a mat-menu-item routerLink="/analytics">
                  <mat-icon>analytics</mat-icon> Analytics
                </a>
              </mat-menu>
            }
            @if (authService.isAdmin()) {
              <button mat-button [matMenuTriggerFor]="adminMenu">
                <mat-icon>admin_panel_settings</mat-icon> <span>Admin</span>
              </button>
              <mat-menu #adminMenu="matMenu">
                <a mat-menu-item routerLink="/admin/dashboard">
                  <mat-icon>dashboard</mat-icon> Admin Dashboard
                </a>
                <a mat-menu-item routerLink="/admin/users">
                  <mat-icon>people</mat-icon> User Management
                </a>
                <a mat-menu-item routerLink="/admin/history">
                  <mat-icon>history</mat-icon> Booking History
                </a>
                <a mat-menu-item routerLink="/admin/settings">
                  <mat-icon>settings</mat-icon> System Settings
                </a>
                <a mat-menu-item routerLink="/admin/logs">
                  <mat-icon>list_alt</mat-icon> Activity Logs
                </a>
              </mat-menu>
            }
          </nav>
          <button mat-button [matMenuTriggerFor]="userMenu" class="user-menu-btn">
            <mat-icon>account_circle</mat-icon> <span class="user-name">{{ authService.user()?.name }}</span>
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
      
      <!-- Mobile Side Menu -->
      @if (mobileMenuOpen && authService.isLoggedIn()) {
        <div class="mobile-overlay" (click)="closeMobileMenu()"></div>
        <div class="mobile-sidenav">
          <div class="mobile-sidenav-header">
            <img src="assets/images/logo-chair.png" alt="SmartServe" class="mobile-logo" width="40" height="40">
            <span>SmartServe</span>
            <button mat-icon-button (click)="closeMobileMenu()" class="close-btn">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <mat-divider></mat-divider>
          <mat-nav-list>
            <a mat-list-item routerLink="/tables" (click)="closeMobileMenu()">
              <mat-icon matListItemIcon>table_restaurant</mat-icon>
              <span matListItemTitle>Tables</span>
            </a>
            <a mat-list-item routerLink="/queue" (click)="closeMobileMenu()">
              <mat-icon matListItemIcon>people</mat-icon>
              <span matListItemTitle>Queue</span>
            </a>
            <a mat-list-item routerLink="/reservation" (click)="closeMobileMenu()">
              <mat-icon matListItemIcon>event</mat-icon>
              <span matListItemTitle>Reservations</span>
            </a>
            <a mat-list-item routerLink="/reservations/history" (click)="closeMobileMenu()">
              <mat-icon matListItemIcon>history</mat-icon>
              <span matListItemTitle>My History</span>
            </a>
            
            @if (authService.isManager()) {
              <mat-divider></mat-divider>
              <div class="nav-section-title">Manager</div>
              <a mat-list-item routerLink="/manager/dashboard" (click)="closeMobileMenu()">
                <mat-icon matListItemIcon>dashboard</mat-icon>
                <span matListItemTitle>Dashboard</span>
              </a>
              <a mat-list-item routerLink="/manager/history" (click)="closeMobileMenu()">
                <mat-icon matListItemIcon>history</mat-icon>
                <span matListItemTitle>Booking History</span>
              </a>
              <a mat-list-item routerLink="/analytics" (click)="closeMobileMenu()">
                <mat-icon matListItemIcon>analytics</mat-icon>
                <span matListItemTitle>Analytics</span>
              </a>
            }
            
            @if (authService.isAdmin()) {
              <mat-divider></mat-divider>
              <div class="nav-section-title">Admin</div>
              <a mat-list-item routerLink="/admin/dashboard" (click)="closeMobileMenu()">
                <mat-icon matListItemIcon>dashboard</mat-icon>
                <span matListItemTitle>Admin Dashboard</span>
              </a>
              <a mat-list-item routerLink="/admin/users" (click)="closeMobileMenu()">
                <mat-icon matListItemIcon>people</mat-icon>
                <span matListItemTitle>User Management</span>
              </a>
              <a mat-list-item routerLink="/admin/history" (click)="closeMobileMenu()">
                <mat-icon matListItemIcon>history</mat-icon>
                <span matListItemTitle>System History</span>
              </a>
              <a mat-list-item routerLink="/admin/settings" (click)="closeMobileMenu()">
                <mat-icon matListItemIcon>settings</mat-icon>
                <span matListItemTitle>System Settings</span>
              </a>
              <a mat-list-item routerLink="/admin/logs" (click)="closeMobileMenu()">
                <mat-icon matListItemIcon>list_alt</mat-icon>
                <span matListItemTitle>Activity Logs</span>
              </a>
            }
            
            <mat-divider></mat-divider>
            <a mat-list-item (click)="authService.logout(); closeMobileMenu()">
              <mat-icon matListItemIcon>logout</mat-icon>
              <span matListItemTitle>Logout</span>
            </a>
          </mat-nav-list>
        </div>
      }
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
    .main-toolbar {
      position: sticky;
      top: 0;
      z-index: 1000;
    }
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
    .spacer { flex: 1; }
    .desktop-nav { display: flex; align-items: center; }
    .desktop-nav a span, .desktop-nav button span { margin-left: 4px; }
    
    /* Mobile Menu Button - Hidden on desktop */
    .mobile-menu-btn { display: none; }
    
    /* Mobile Overlay */
    .mobile-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1001;
    }
    
    /* Mobile Sidenav */
    .mobile-sidenav {
      position: fixed;
      top: 0;
      left: 0;
      width: 280px;
      height: 100%;
      background: white;
      z-index: 1002;
      box-shadow: 2px 0 8px rgba(0, 0, 0, 0.2);
      overflow-y: auto;
    }
    .mobile-sidenav-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: #1976d2;
      color: white;
    }
    .mobile-logo {
      width: 40px;
      height: 40px;
      border-radius: 50%;
    }
    .mobile-sidenav-header span {
      flex: 1;
      font-size: 18px;
      font-weight: 500;
    }
    .close-btn { color: white; }
    .nav-section-title {
      padding: 12px 16px 4px;
      font-size: 12px;
      font-weight: 500;
      color: #666;
      text-transform: uppercase;
    }
    
    /* Mobile Responsive */
    @media (max-width: 900px) {
      .mobile-menu-btn { display: block; }
      .desktop-nav { display: none; }
      .brand-name { display: none; }
      .user-name { display: none; }
    }
    
    @media (max-width: 600px) {
      .toolbar-logo { width: 32px; height: 32px; }
    }
  `]
})
export class AppComponent {
  mobileMenuOpen = false;
  
  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  // Check if current page is a public page (landing, login, register)
  isPublicPage(): boolean {
    const publicRoutes = ['/', '', '/login', '/register'];
    return publicRoutes.includes(this.router.url) || this.router.url.startsWith('/login') || this.router.url.startsWith('/register');
  }
  
  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }
  
  closeMobileMenu() {
    this.mobileMenuOpen = false;
  }
}

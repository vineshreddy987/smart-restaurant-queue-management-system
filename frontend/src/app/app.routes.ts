import { Routes } from '@angular/router';
import { authGuard, managerGuard, adminGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./components/landing/landing.component').then(m => m.LandingComponent) },
  { path: 'login', loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./components/register/register.component').then(m => m.RegisterComponent) },
  { path: 'tables', loadComponent: () => import('./components/table-list/table-list.component').then(m => m.TableListComponent), canActivate: [authGuard] },
  { path: 'queue', loadComponent: () => import('./components/queue-management/queue-management.component').then(m => m.QueueManagementComponent), canActivate: [authGuard] },
  { path: 'reservation', loadComponent: () => import('./components/reservation/reservation.component').then(m => m.ReservationComponent), canActivate: [authGuard] },
  
  // Customer Booking History
  { path: 'reservations/history', loadComponent: () => import('./components/booking-history/customer-history.component').then(m => m.CustomerHistoryComponent), canActivate: [authGuard] },
  
  // Manager Routes
  { path: 'manager/dashboard', loadComponent: () => import('./components/manager-dashboard/manager-dashboard.component').then(m => m.ManagerDashboardComponent), canActivate: [authGuard, managerGuard] },
  { path: 'manager/history', loadComponent: () => import('./components/booking-history/manager-history.component').then(m => m.ManagerHistoryComponent), canActivate: [authGuard, managerGuard] },
  { path: 'analytics', loadComponent: () => import('./components/analytics/analytics.component').then(m => m.AnalyticsComponent), canActivate: [authGuard, managerGuard] },
  
  // Admin Routes
  { path: 'admin/dashboard', loadComponent: () => import('./components/admin/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent), canActivate: [authGuard, adminGuard] },
  { path: 'admin/users', loadComponent: () => import('./components/admin/admin-users/admin-users.component').then(m => m.AdminUsersComponent), canActivate: [authGuard, adminGuard] },
  { path: 'admin/settings', loadComponent: () => import('./components/admin/admin-settings/admin-settings.component').then(m => m.AdminSettingsComponent), canActivate: [authGuard, adminGuard] },
  { path: 'admin/logs', loadComponent: () => import('./components/admin/admin-logs/admin-logs.component').then(m => m.AdminLogsComponent), canActivate: [authGuard, adminGuard] },
  { path: 'admin/history', loadComponent: () => import('./components/booking-history/admin-history.component').then(m => m.AdminHistoryComponent), canActivate: [authGuard, adminGuard] },
  
  { path: 'unauthorized', loadComponent: () => import('./components/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent) },
  { path: '**', redirectTo: '/' }
];

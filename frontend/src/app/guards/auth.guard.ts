import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if token exists AND is valid (not expired)
  if (authService.checkAuth()) {
    return true;
  }
  
  // Store the attempted URL for redirecting after login
  sessionStorage.setItem('redirectUrl', state.url);
  
  router.navigate(['/login']);
  return false;
};

export const managerGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // First check if authenticated with valid token
  if (!authService.checkAuth()) {
    sessionStorage.setItem('redirectUrl', state.url);
    router.navigate(['/login']);
    return false;
  }

  if (authService.isManager()) {
    return true;
  }
  
  router.navigate(['/unauthorized']);
  return false;
};

export const adminGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // First check if authenticated with valid token
  if (!authService.checkAuth()) {
    sessionStorage.setItem('redirectUrl', state.url);
    router.navigate(['/login']);
    return false;
  }

  if (authService.isAdmin()) {
    return true;
  }
  
  router.navigate(['/unauthorized']);
  return false;
};

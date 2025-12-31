import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = localStorage.getItem('token');
  
  // Clone request with auth header if token exists
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }
  
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 Unauthorized - token expired or invalid
      if (error.status === 401) {
        // Don't redirect if already on login page or if it's a login request
        const isLoginRequest = req.url.includes('/auth/login');
        const isOnLoginPage = router.url === '/login';
        
        if (!isLoginRequest && !isOnLoginPage) {
          // Clear auth data and redirect to login
          authService.logout(true);
        }
      }
      return throwError(() => error);
    })
  );
};
